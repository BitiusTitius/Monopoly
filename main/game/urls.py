from django.urls import path
from . import views # Import the views module from the current app (game)

# The list of URL patterns for the 'game' application
urlpatterns = [
    path('', views.home_view, name='home'), 
    path('game/<str:party_code>/', views.game_view, name='game'),
]