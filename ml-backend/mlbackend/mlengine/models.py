from django.db import models
from mongoengine import Document, EmbeddedDocument, DateTimeField
from mongoengine.fields import (
    FloatField, IntField, StringField, EmbeddedDocumentListField
)
import datetime
class Videos(models.Model):
    query_id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    consumer_id = models.BigIntegerField()
    download_address = models.CharField()
    created_at = models.DateTimeField()
    video_id = models.BigIntegerField()
    
    class Meta:
        managed = False
        db_table = 'Videos'
        db_table_comment = 'Storing video download address'

class EmotionEntry(EmbeddedDocument):
    
    angry=FloatField()
    disgust=FloatField()
    fear=FloatField()
    happy=FloatField()
    sad=FloatField()
    surprise=FloatField()
    neutral=FloatField()
    frame = IntField()
    time = FloatField()

class EmotionResult(Document):
    meta = {
        'collection': 'emotion_results', 
        'indexes': [
            'video_id'  
        ]
    }
    user_id=StringField(max_length=100)
    video_id=StringField(max_length=100)
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    emotion=EmbeddedDocumentListField(EmotionEntry)
   

