from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from .serializers import VideoSerializer, EmotionResultSerializer
from .models import Videos, EmotionEntry, EmotionResult
import requests
import io
import cv2
import pandas as pd
from deepface import DeepFace
from tqdm import tqdm
import tempfile
import os
import imageio

class VideoEmotionSet (viewsets.ModelViewSet):
    queryset = Videos.objects.all()
    serializer_class = VideoSerializer

    @action(detail=False, methods=['post'])
    def process_emotions(self, request):
        temp_video_path = None
        try:
            video_id = request.data.get('video_id', None)
            if not video_id:
                return Response({'error': 'video_id is required'}, status=400)

            videos = Videos.objects.filter(video_id=video_id)
            if not videos.exists():
                return Response({'error': 'Video not found'}, status=404)

            for video in videos:
                video_address = video.download_address
                video_data = requests.get(video_address).content

                with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp_file:
                    tmp_file.write(video_data)
                    temp_video_path = tmp_file.name

                emotion_df = self.process_video_emotions(temp_video_path)
                emotion_results = emotion_df.to_dict(orient='records')
                
                emotion_payload = {
                    "user_id": str(video.user_id),
                    "video_id": str(video.video_id),
                    "emotion": emotion_results
                }

                serializer = EmotionResultSerializer(data=emotion_payload)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data, status=201)
                else:
                    return Response(serializer.errors, status=400)

        except Exception as e:
            print(f"Error: {e}")
            return Response({'error': str(e)}, status=500)
        finally:
            if temp_video_path and os.path.exists(temp_video_path):
                os.remove(temp_video_path)
            

    def process_video_emotions(self,video_path, frame_interval=5):

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError("Could not open video file")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        emotion_data = []
        frame_count = 0

        with tqdm(total=total_frames) as pbar:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % frame_interval == 0:
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    try:
                        # Analyze face and emotions
                        analysis = DeepFace.analyze(rgb_frame, actions=['emotion'], enforce_detection=True, silent=True)
                        if analysis:
                            emotions = analysis[0]['emotion']
                            emotions['frame'] = frame_count
                            emotions['time'] = frame_count / fps
                            emotion_data.append(emotions)
                    except:
                        pass

                frame_count += 1
                pbar.update(1)

        cap.release()

        df = pd.DataFrame(emotion_data)
        if df.empty:
            raise ValueError("No faces detected in the video")
        df['time'] = df['time'].round(1)
        return df