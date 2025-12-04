from django.shortcuts import render

def throwaway(request):
    return render(request, 'throwaway.html')