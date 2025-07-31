
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class ProtectedView(APIView):

    #permission_classes = [IsAuthenticated] # This view requires authentication

    def get(self, request):

        return Response({"message": f"Hello, {request.user.username}! This is a protected endpoint."})

