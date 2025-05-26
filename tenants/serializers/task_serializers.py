from rest_framework import serializers
from ..models import TaskGroup, Task, Member

class TaskGroupSerializer(serializers.ModelSerializer):
    members = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Member.objects.all(),
        required=False
    )
    member_names = serializers.SerializerMethodField()
    shift_display = serializers.SerializerMethodField()

    class Meta:
        model = TaskGroup
        fields = ['id', 'name', 'description', 'edir', 'event', 'members', 'member_names',
                 'shift', 'shift_custom', 'shift_display', 'created_by', 'created_at', 'is_active']
        read_only_fields = ['id', 'created_by', 'created_at', 'edir', 'member_names', 'shift_display']

    def get_member_names(self, obj):
        return [member.full_name for member in obj.members.all()]
    
    def get_shift_display(self, obj):
        return obj.get_shift_display()

class TaskSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Member.objects.all(),
        required=True
    )
    assigned_to_names = serializers.SerializerMethodField()
    assigned_by_name = serializers.CharField(source='assigned_by.full_name', read_only=True)
    task_group_name = serializers.CharField(source='task_group.name', read_only=True)
    shift_display = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ['id', 'task_group', 'task_group_name', 'title', 'description', 
                 'assigned_to', 'assigned_to_names', 'assigned_by', 'assigned_by_name',
                 'shift', 'shift_custom', 'shift_display', 'due_date', 'priority', 'status', 
                 'created_at', 'completed_at']
        read_only_fields = ['id', 'assigned_by', 'created_at', 'completed_at', 
                          'task_group', 'assigned_to_names', 'shift_display']

    def get_assigned_to_names(self, obj):
        return [member.full_name for member in obj.assigned_to.all()]
    
    def get_shift_display(self, obj):
        return obj.get_shift_display()