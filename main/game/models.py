import uuid
from django.db import models

class GameUser(models.Model):
    id = models.UUIDField(primary_key = True, default = uuid.uuid4, editable = False)
    username = models.CharField(max_length = 50, unique = True)
    created_at = models.DateTimeField(auto_now_add = True)
    def __str__(self):
        return f"{self.username} ({self.id})"