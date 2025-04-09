from tenants.models import Edir

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
