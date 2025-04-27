import os
from rest_framework import status, viewsets, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from firebase_admin import auth
from django.contrib.auth import login
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import F, Max
from django.conf import settings
from django.http import Http404

from .models import (
    ViewerProfile, User, Video, VideoView, VideoLike, VideoShare, WebcamRecording,
    EvaluationForm, EvaluationQuestion, EvaluationResponse
)
from .serializers import (
    OnboardingSerializer, FirebaseTokenSerializer, 
    VideoSerializer, VideoFeedSerializer, VideoDetailSerializer,
    VideoViewSerializer, VideoLikeSerializer, VideoShareSerializer,
    EvaluationFormSerializer, EvaluationQuestionSerializer, 
    EvaluationResponseSerializer, UserPointsSerializer
)
from .utils import should_make_private, make_video_private, record_user_view, increment_video_views
from .permissions import IsCompanyOrAdmin, IsOwnerOrAdmin
from .services import EvaluationService, PointsService, AzureStorageService
import uuid


class TestAuthView(generics.RetrieveAPIView):
    """Simple endpoint to test if authentication is working."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            "success": True,
            "message": "Authentication successful!",
            "user_role": request.user.role
        })


class OnboardingAPIView(generics.UpdateAPIView):
    """API endpoint for handling user onboarding."""
    permission_classes = [IsAuthenticated]
    serializer_class = OnboardingSerializer

    def get_object(self):
        viewer_profile, _ = ViewerProfile.objects.get_or_create(user=self.request.user)
        return viewer_profile

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        serializer.validated_data['onboarding_completed'] = True
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class SetFirebaseTokenView(generics.CreateAPIView):
    """Set Firebase token for DRF browsable API authentication."""
    permission_classes = [AllowAny]
    serializer_class = FirebaseTokenSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        token = serializer.validated_data['token']
        return self._process_token(token)
    
    def _process_token(self, token):
        """Process the Firebase token and authenticate the user."""
        try:
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token["uid"]
            
            try:
                user = User.objects.get(firebase_uid=uid)
                login(self.request, user)
                return Response({
                    "success": True,
                    "message": "Authenticated successfully. You can now use the API browser.",
                })
            except User.DoesNotExist:
                return Response({"error": "User not found in Django database"}, status=404)
        except Exception as e:
            return Response({"error": f"Invalid token: {str(e)}"}, status=400)


class VideoFeedView(generics.ListAPIView):
    """List all publicly available videos for feed."""
    queryset = Video.objects.filter(visibility='public')
    serializer_class = VideoFeedSerializer
    permission_classes = [AllowAny]


class VideoDetailView(generics.RetrieveAPIView):
    """Retrieve detailed information about a specific video."""
    queryset = Video.objects.all()
    serializer_class = VideoDetailSerializer
    permission_classes = [AllowAny]  # We'll check permissions in the view
    lookup_url_kwarg = 'video_identifier'
    
    def get_video_by_id(self, video_id):
        """Get video by numeric ID."""
        return get_object_or_404(Video, id=int(video_id))
    
    def get_video_by_token(self, token):
        """Get video by share token and update access count."""        
        share = get_object_or_404(VideoShare, share_token=token, active=True)
        
        # Update access count
        share.access_count = F('access_count') + 1
        share.save(update_fields=['access_count'])
        
        return share.video
    
    def is_valid_uuid(self, identifier):
        """Check if the string is a valid UUID."""
        try:
            uuid.UUID(identifier, version=4)
            return True
        except ValueError:
            return False
    
    def get_object(self):
        """Get video by ID or share token."""
        identifier = self.kwargs.get(self.lookup_url_kwarg)
        if not identifier:
            raise Http404("Video identifier is required")
        
        # Case 1: Numeric ID
        if identifier.isdigit():
            return self.get_video_by_id(identifier)
            
        # Case 2: UUID share token
        if self.is_valid_uuid(identifier):
            try:
                return self.get_video_by_token(identifier)
            except VideoShare.DoesNotExist:
                raise Http404("Shared video not found or share link is inactive")
                
        # Case 3: Invalid format
        raise Http404("Invalid video identifier format")
    
    def check_video_availability(self, video):
        """Check if the video is available for viewing."""
        # Admin users can always view videos
        if self.request.user.is_authenticated and self.request.user.role == 'admin':
            return True
            
        # Owner can view their own videos regardless of visibility
        if self.request.user.is_authenticated and video.uploader == self.request.user:
            return True
            
        # Checking if video is private
        if video.visibility == 'private':
            return False
        
        # Checking if it should be made private due to limits
        if should_make_private(video):
            make_video_private(video)
            return False
            
        return True
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        context['frontend_url'] = settings.FRONTEND_URL
        return context
    
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            
            if not self.check_video_availability(instance):
                return Response(
                    {"error": "This video is no longer available"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
            
        except Http404 as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )


class RecordVideoViewAPI(APIView):
    """Record a view for a video."""
    permission_classes = [AllowAny]
    
    def post(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)
        
        # Skip if video already private
        if video.visibility == 'private':
            return Response({"error": "Video is private"}, status=status.HTTP_403_FORBIDDEN)
        
        # Record view for authenticated users
        record_user_view(video, request.user)
        current_views = increment_video_views(video)
        privacy_changed = False
        if should_make_private(video):
            privacy_changed = make_video_private(video)
        
        return Response({
            "success": True,
            "views": current_views,
            "privacy_changed": privacy_changed
        })


class ToggleVideoLikeAPI(APIView):
    """Toggle like status for a video."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)
        
        like, created = VideoLike.objects.get_or_create(
            video=video, 
            user=request.user,
            defaults={'liked_at': timezone.now()}
        )
        
        if not created:
            like.delete()
            return self._update_like_count(video, False)
        
        return self._update_like_count(video, True)
    
    def _update_like_count(self, video, liked):
        """Update the like count for a video."""
        video.likes = F('likes') + (1 if liked else -1)
        video.save(update_fields=['likes'])
        video.refresh_from_db()
        return Response({"liked": liked, "likes": video.likes})


class CreateVideoShareAPI(APIView):
    """Create a shareable link for a video."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)
        
        # Check if user is owner or admin
        if video.uploader != request.user and request.user.role != 'admin':
            return Response(
                {"error": "You don't have permission to share this video"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create a new share link
        share = VideoShare.objects.create(
            video=video,
            created_by=request.user
        )
        
        context = {
            'request': request,
            'frontend_url': settings.FRONTEND_URL
        }
        
        serializer = VideoShareSerializer(share, context=context)
        return Response(serializer.data)


class UserHistoryAPI(generics.ListAPIView):
    """List videos the user has viewed."""
    permission_classes = [IsAuthenticated]
    serializer_class = VideoDetailSerializer
    
    def get_queryset(self):
        # For admin users, they can see all viewed videos
        if self.request.user.role == 'admin':
            viewed_video_ids = VideoView.objects.values_list('video_id', flat=True).distinct()
        else:
            # Regular users see only their viewed videos
            viewed_video_ids = VideoView.objects.filter(
                viewer=self.request.user
            ).values_list('video_id', flat=True)
        
        return Video.objects.filter(id__in=viewed_video_ids).order_by('-upload_date')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['frontend_url'] = settings.FRONTEND_URL
        return context


class UserLikedVideosAPI(generics.ListAPIView):
    """List videos the user has liked."""
    permission_classes = [IsAuthenticated]
    serializer_class = VideoDetailSerializer
    
    def get_queryset(self):
        # For admin users, they can see all liked videos
        if self.request.user.role == 'admin':
            liked_video_ids = VideoLike.objects.values_list('video_id', flat=True).distinct()
        else:
            # Regular users see only their liked videos
            liked_video_ids = VideoLike.objects.filter(
                user=self.request.user
            ).values_list('video_id', flat=True)
        
        return Video.objects.filter(id__in=liked_video_ids).order_by('-upload_date')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['frontend_url'] = settings.FRONTEND_URL
        return context


class UploadVideoView(generics.CreateAPIView):
    """Create a new video and generate SAS upload URLs.
    Only admin and company users can upload videos."""
    permission_classes = [IsAuthenticated, IsCompanyOrAdmin]
    serializer_class = VideoSerializer

    def create(self, request, *args, **kwargs):
        filename = request.data.get('filename')
        if not filename: 
            return Response({"error": "Filename is required"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return self._generate_upload_tokens(serializer, filename)
    
    def _generate_upload_tokens(self, serializer, filename):
        """Generate SAS tokens for video and thumbnail uploads using AzureStorageService."""
        try:
            # Generate URLs for video and thumbnail
            video_upload_url, video_view_url = AzureStorageService.get_video_urls(filename)
            thumbnail_upload_url, thumbnail_view_url = AzureStorageService.get_thumbnail_urls(filename)

            # Save the video with the permanent view URLs
            serializer.save(
                uploader=self.request.user,
                video_url=video_view_url,
                thumbnail_url=thumbnail_view_url
            )

            return Response({
                "video_upload_url": video_upload_url,
                "thumbnail_upload_url": thumbnail_upload_url,
                "message": "SAS tokens generated successfully"
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to generate SAS tokens: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WebcamUploadView(APIView):
    """Generate SAS upload URL for webcam recordings."""
    permission_classes = [IsAuthenticated]

    def post(self, request, video_id):
        # Validate request data
        filename = request.data.get('filename')
        if not filename:
            return Response(
                {"error": "Filename is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get the video and verify the user has access rights
        video = get_object_or_404(Video, id=video_id)
        
        # Generate SAS token for webcam recording upload
        try:
            # Get Azure storage credentials
            account_name = os.environ.get('AZURE_STORAGE_ACCOUNT_NAME')
            account_key = os.environ.get('AZURE_STORAGE_ACCOUNT_KEY')
            container_name = os.environ.get('AZURE_WEBCAM_CONTAINER_NAME', 'facialvideo')
            
            # Define permissions
            upload_permission = BlobSasPermissions(write=True, create=True, add=True)
            
            # Generate SAS URL for webcam recording
            sas_token = generate_blob_sas(
                account_name=account_name,
                container_name=container_name,
                blob_name=filename,
                account_key=account_key,
                permission=upload_permission,
                expiry=timezone.now() + timezone.timedelta(hours=1)
            )
            
            webcam_upload_url = f"https://{account_name}.blob.core.windows.net/{container_name}/{filename}?{sas_token}"
            
            # Create a record of this webcam recording
            WebcamRecording.objects.create(
                video=video,
                filename=filename,
                recorder=request.user,
                upload_status='pending'
            )
            
            return Response({
                "webcam_upload_url": webcam_upload_url,
                "message": "Webcam recording upload URL generated successfully"
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to generate SAS token: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VideoSearchView(generics.ListAPIView):
    """API endpoint for searching videos by filename or other criteria."""
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        filename = self.request.query_params.get('filename')
        if filename:
            # Extract the base part of the filename that we stored in the database
            parts = filename.split('?')[0].split('/')
            base_filename = parts[-1] if parts else filename
            
            # Get videos with URLs containing this filename
            videos = Video.objects.filter(video_url__contains=base_filename)
            
            # If admin, return all matches
            if self.request.user.role == 'admin':
                return videos
                
            # Otherwise, return only videos uploaded by this user
            return videos.filter(uploader=self.request.user)
            
        # Default empty queryset if no search criteria
        return Video.objects.none()


class EvaluationFormViewSet(viewsets.ModelViewSet):
    """
    ViewSet for EvaluationForm model providing CRUD operations.
    """
    serializer_class = EvaluationFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role == 'admin':
            return EvaluationForm.objects.all()
        return EvaluationForm.objects.filter(created_by=self.request.user)
    
    def get_video(self, video_id):
        """Get video by ID or raise 404"""
        return get_object_or_404(Video, id=video_id)
    
    def check_form_creation_permission(self, request, video):
        """Check if user has permission to create/update form for video"""
        # Only company or admin can create forms
        if request.user.role not in ['company', 'admin']:
            return False, "Only content creators and admins can create evaluation forms"
            
        # Check if user is owner or admin
        if video.uploader != request.user and request.user.role != 'admin':
            return False, "You don't have permission to create an evaluation form for this video"
            
        return True, None
        
    def add_default_questions(self, form):
        """Add default questions to a new evaluation form"""
        default_questions = [
            {
                "question_text": "How would you rate the effectiveness of this ad?",
                "question_type": "rating",
                "required": True,
                "order": 0
            },
            {
                "question_text": "What aspects of the ad did you find most appealing?",
                "question_type": "text",
                "required": True,
                "order": 1
            },
            {
                "question_text": "Which message from the ad resonated with you most?",
                "question_type": "multiple_choice",
                "options": ["Product features", "Emotional appeal", "Brand messaging", "Visual elements", "Other"],
                "required": True,
                "order": 2
            },
            {
                "question_text": "Would this ad make you more likely to purchase the product?",
                "question_type": "rating",
                "required": True,
                "order": 3
            }
        ]
        
        for question_data in default_questions:
            EvaluationQuestion.objects.create(form=form, **question_data)
    
    @action(detail=False, methods=['get'], url_path=r'video/(?P<video_id>\d+)')
    def get_by_video(self, request, video_id=None):
        """Get evaluation form for a specific video"""
        video = self.get_video(video_id)
        try:
            form = EvaluationForm.objects.get(video=video)
            serializer = self.get_serializer(form)
            
            # Check if user has already submitted
            user_submitted = False
            if request.user.is_authenticated:
                user_submitted = EvaluationResponse.objects.filter(
                    form=form,
                    user=request.user
                ).exists()
                
            return Response({
                **serializer.data,
                'user_submitted': user_submitted
            })
        except EvaluationForm.DoesNotExist:
            return Response(
                {"error": "No evaluation form exists for this video"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], url_path=r'video/(?P<video_id>\d+)')
    def create_for_video(self, request, video_id=None):
        """Create new evaluation form for a video"""
        video = self.get_video(video_id)
        
        has_permission, error_message = self.check_form_creation_permission(request, video)
        if not has_permission:
            return Response({"error": error_message}, status=status.HTTP_403_FORBIDDEN)
        
        # Check for existing form
        if hasattr(video, 'evaluation_form'):
            return Response(
                {"error": "An evaluation form already exists for this video"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Create form
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            form = serializer.save(
                video=video,
                created_by=request.user
            )
            if request.data.get('add_default_questions', False):
                self.add_default_questions(form)
            
            return Response(
                self.get_serializer(form).data, 
                status=status.HTTP_201_CREATED
            )
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['put', 'patch'], url_path=r'video/(?P<video_id>\d+)')
    def update_for_video(self, request, video_id=None, partial=False):
        """Update existing evaluation form for a video"""
        video = self.get_video(video_id)
        has_permission, error_message = self.check_form_creation_permission(request, video)
        if not has_permission:
            return Response({"error": error_message}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            form = EvaluationForm.objects.get(video=video)
        except EvaluationForm.DoesNotExist:
            return Response(
                {"error": "No evaluation form exists for this video"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        serializer = self.get_serializer(form, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EvaluationQuestionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for EvaluationQuestion model providing CRUD operations.
    """
    serializer_class = EvaluationQuestionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        form_id = self.kwargs.get('form_id')
        return EvaluationQuestion.objects.filter(form_id=form_id).order_by('order')
    
    def get_form(self):
        form_id = self.kwargs.get('form_id')
        return get_object_or_404(EvaluationForm, id=form_id)
    
    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method not in ['GET', 'HEAD', 'OPTIONS']:
            form = self.get_form()
            if form.created_by != request.user and request.user.role != 'admin':
                self.permission_denied(
                    request, 
                    message="You don't have permission to modify questions in this form"
                )
    
    def perform_create(self, serializer):
        form = self.get_form()
        if 'order' not in serializer.validated_data:
            last_order = EvaluationQuestion.objects.filter(form=form).aggregate(
                Max('order'))['order__max'] or -1
            serializer.validated_data['order'] = last_order + 1
                
        serializer.save(form=form)
    
    def perform_destroy(self, instance):
        form = instance.form
        instance.delete()
        remaining_questions = EvaluationQuestion.objects.filter(form=form).order_by('order')
        for i, q in enumerate(remaining_questions):
            if q.order != i:
                q.order = i
                q.save(update_fields=['order'])


class SubmitEvaluationResponseView(generics.CreateAPIView):
    serializer_class = EvaluationResponseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_form(self, form_id):
        """Get evaluation form by ID or raise 404"""
        return get_object_or_404(EvaluationForm, id=form_id)
    
    def check_previous_submission(self, form, user):
        """Check if user has already submitted a response for this form"""
        return EvaluationResponse.objects.filter(form=form, user=user).exists()
    
    def create(self, request, *args, **kwargs):
        form_id = self.kwargs.get('form_id')
        form = self.get_form(form_id)
        
        # Check if user already submitted
        if self.check_previous_submission(form, request.user):
            return Response(
                {"error": "You have already submitted an evaluation for this video"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get and validate answers
        answers = request.data.get('answers', {})
        valid, error_message = EvaluationService.validate_required_answers(form, answers)
        if not valid:
            return Response(
                {"error": error_message},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create response and award points
        _, profile, points_awarded = EvaluationService.create_response_and_award_points(
            form=form,
            user=request.user,
            answers=answers
        )
        
        return Response({
            "message": "Evaluation submitted successfully",
            "points_awarded": points_awarded,
            "total_points": profile.points,
            "points_value": profile.calculate_points_value()
        }, status=status.HTTP_201_CREATED)


class UserPointsView(generics.RetrieveAPIView):
    """
    API endpoint for retrieving user points information.
    """
    serializer_class = UserPointsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        profile, _ = ViewerProfile.objects.get_or_create(user=self.request.user)
        return profile