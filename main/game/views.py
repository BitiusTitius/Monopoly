from django.shortcuts import render
from django.http import JsonResponse, HttpRequest, HttpResponse
import json
import uuid

# this assigns a player a UUID
def home_view(request):
    player_uuid = request.COOKIES.get('player_uuid')
    if not player_uuid:
        player_uuid = str(uuid.uuid4())
    response = render(request, 'home.html', {'player_uuid': player_uuid})
    if not request.COOKIES.get('player_uuid'):
        response.set_cookie(
            'player_uuid',
            player_uuid,
            max_age=365*24*60*60,
            httponly=False,
            samesite='Lax'
        )
    return response

# generates a 6-character party code
def generatePartyCode():
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"