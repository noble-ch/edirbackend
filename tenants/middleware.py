from tenants.models import Edir, Member
from django.http import HttpResponseForbidden


class EdirSlugMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path_parts = request.path_info.strip('/').split('/')
        if path_parts:
            edir_slug = path_parts[0]
            try:
                request.edir = Edir.objects.get(slug=edir_slug, approved=True)
            except Edir.DoesNotExist:
                request.edir = None
        else:
            request.edir = None

        return self.get_response(request)

class EdirMembershipMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        # Skip for login views and admin
        if view_func.__name__ == 'UserLoginAPIView' or request.path.startswith(('/admin/', '/api/auth/login/', '/swagger/', '/redoc/')):
            return None
        
        edir_slug = view_kwargs.get('edir_slug')
        if edir_slug and request.user.is_authenticated:
            try:
                member = Member.objects.get(
                    user=request.user,
                    edir__slug=edir_slug,
                    is_approved=True
                )
                request.member = member
            except Member.DoesNotExist:
                return HttpResponseForbidden("You are not an approved member of this Edir")
        return None