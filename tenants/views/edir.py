from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.renderers import TemplateHTMLRenderer
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from ..forms import EdirRequestForm

class EdirRequestAPIView(APIView):
    renderer_classes = [TemplateHTMLRenderer]
    template_name = 'tenants/edir_request.html'

    @swagger_auto_schema(
        operation_description="Submit a request to create a new Edir",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'name': openapi.Schema(type=openapi.TYPE_STRING, description='Name of the Edir'),
                'description': openapi.Schema(type=openapi.TYPE_STRING, description='Description of the Edir'),
                'location': openapi.Schema(type=openapi.TYPE_STRING, description='Location of the Edir'),
            },
            required=['name', 'description', 'location'],
        ),
        responses={
            200: openapi.Response(
                description="Edir request submitted successfully",
                examples={
                    "text/html": "<html><body>Edir request success</body></html>"
                }
            )
        }
    )
    def post(self, request, *args, **kwargs):
        form = EdirRequestForm(request.data)
        if form.is_valid():
            form.save()
            return Response(template_name='tenants/edir_request_success.html')
        return Response({'form': form}, template_name='tenants/edir_request.html')

    def get(self, request, *args, **kwargs):
        form = EdirRequestForm()
        return Response({'form': form})