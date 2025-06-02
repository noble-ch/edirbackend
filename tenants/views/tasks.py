from django.forms import ValidationError
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404

from ..permissions import IsEventCoordinatorOrHead
from ..serializers import TaskGroupSerializer, TaskSerializer
from ..models import TaskGroup, Task, Member,Event
from ..models import Edir

class TaskGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsEventCoordinatorOrHead]
    serializer_class = TaskGroupSerializer
    
    def get_queryset(self):
        event_id = self.kwargs.get('event_id')
        return TaskGroup.objects.filter(event_id=event_id).prefetch_related('members')

    def perform_create(self, serializer):
        event_id = self.kwargs.get('event_id')
        event = get_object_or_404(Event, id=event_id)
        member = get_object_or_404(Member, user=self.request.user, edir=event.edir)
        serializer.save(event=event, edir=event.edir, created_by=member)
 
    @action(detail=True, methods=['post'])
    def add_members(self, request, event_id=None, pk=None):
        task_group = self.get_object()
        member_ids = request.data.get('member_ids', [])
        members = Member.objects.filter(id__in=member_ids, edir=task_group.edir)
        task_group.members.add(*members)
        return Response({'status': 'members added'})

class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsEventCoordinatorOrHead]
    serializer_class = TaskSerializer

    def get_queryset(self):
        task_group_id = self.kwargs.get('task_group_id')
        return Task.objects.filter(task_group_id=task_group_id).prefetch_related('assigned_to')

    def perform_create(self, serializer):
        task_group_id = self.kwargs.get('task_group_id')
        task_group = get_object_or_404(TaskGroup, id=task_group_id)
        member = get_object_or_404(Member, user=self.request.user, edir=task_group.edir)
        
        # Validate that assigned members belong to the task group
        assigned_to = serializer.validated_data.get('assigned_to', [])
        for member_obj in assigned_to:
            if member_obj not in task_group.members.all():
                raise ValidationError(f"Member {member_obj.id} is not part of this task group")
        
        serializer.save(task_group=task_group, assigned_by=member)

    @action(detail=True, methods=['post'])
    def complete(self, request, edir_slug=None, event_id=None, task_group_id=None, pk=None):
        edir = get_object_or_404(Edir, slug=edir_slug)
        task = self.get_object()
        if task.task_group.edir != edir:
            return Response({'detail': 'Task does not belong to this edir.'}, status=400)
        task.status = 'completed'
        task.completed_at = timezone.now()
        task.save()
        return Response({'status': 'task completed'})
    lookup_field = 'id' 
    @action(detail=True, methods=['post'], url_path='completed',permission_classes=[IsAuthenticated])
    def completed(self, request, edir_slug=None,id=None):
        edir = get_object_or_404(Edir, slug=edir_slug)
        task = get_object_or_404(Task, id=id)
        if task.task_group.edir != edir:
            return Response({'detail': 'Task does not belong to this edir.'}, status=400)
        task.status = 'completed'
        task.completed_at = timezone.now()
        task.save()
        return Response({'status': 'task completed'})

    
    @action(detail=False, methods=['get'], url_path='my-assigned', permission_classes=[IsAuthenticated])
    def my_assigned_tasks(self, request, edir_slug=None):
        """
        Lists all tasks assigned to the currently authenticated user
        within the specified Edir (by slug) across all task groups they are a member of.
        """
        user = request.user

        edir = get_object_or_404(Edir, slug=edir_slug)
        member_instances = Member.objects.filter(user=user, edir=edir)

        if not member_instances.exists():
            return Response([], status=200) 

        queryset = Task.objects.filter(
            assigned_to__in=member_instances,
            task_group__edir=edir
        ).distinct()

        queryset = queryset.prefetch_related(
            'assigned_to', 'assigned_by',
            'task_group', 'task_group__event', 'task_group__edir'
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)