from rest_framework import serializers
from ..models import Resource, ResourceAllocation, ResourceUsage
from django.core.validators import MinValueValidator

class ResourceSerializer(serializers.ModelSerializer):
    edir_slug = serializers.CharField(source='edir.slug', read_only=True)
    current_value = serializers.SerializerMethodField(read_only=True)
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Resource
        fields = '__all__'
        read_only_fields = (
            'edir', 
            'created_at', 
            'updated_at', 
            'current_value',
            'condition_display',
            'category_display'
        )
        extra_kwargs = {
            'quantity': {'min_value': 1},
            'purchase_price': {'min_value': 0},
            'rental_price_per_day': {'min_value': 0},
            'replacement_cost': {'min_value': 0},
            'expected_lifespan': {'min_value': 1},
        }

    def get_current_value(self, obj):
        return obj.current_value

    def validate(self, data):
        if data.get('purchase_date') and not data.get('purchase_price'):
            raise serializers.ValidationError(
                "Purchase price is required when purchase date is provided"
            )
        return data

class ResourceAllocationSerializer(serializers.ModelSerializer):
    edir_slug = serializers.CharField(source='resource.edir.slug', read_only=True)
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    duration_days = serializers.SerializerMethodField(read_only=True)
    resource_usage_id = serializers.SerializerMethodField(read_only=True)
    calculated_cost = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )

    def get_resource_usage_id(self, obj):
        try:
            return obj.usage.id
        except AttributeError:
            return None
            
    class Meta:
        model = ResourceAllocation
        fields = '__all__'
        read_only_fields = (
            'created_at', 
            'member', 
            'status_changed_at',
            'calculated_cost',
            'duration_days',
            'status_display',
        )
        extra_kwargs = {
            'quantity': {'min_value': 1},
            'calculated_cost': {'min_value': 0},
            'actual_cost': {'min_value': 0},
            'deposit_paid': {'min_value': 0},
        }

    def get_duration_days(self, obj):
        return obj.duration_days

    def validate(self, data):
        if 'start_date' in data and 'end_date' in data:
            if data['start_date'] >= data['end_date']:
                raise serializers.ValidationError(
                    "End date must be after start date"
                )
        
        if 'resource' in data and 'quantity' in data:
            if data['quantity'] > data['resource'].quantity:
                raise serializers.ValidationError(
                    f"Requested quantity exceeds available quantity ({data['resource'].quantity})"
                )
        
        return data
        
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
        
    def create(self, validated_data):
        validated_data['member'] = self.context['request'].user.member
        return super().create(validated_data)

class ResourceUsageSerializer(serializers.ModelSerializer):
    edir_slug = serializers.CharField(source='allocation.resource.edir.slug', read_only=True)
    resource_name = serializers.CharField(source='allocation.resource.name', read_only=True)
    member_name = serializers.CharField(source='allocation.member.full_name', read_only=True)
    event_title = serializers.CharField(source='allocation.event.title', read_only=True)

    pre_use_condition_display = serializers.CharField(
        source='get_pre_use_condition_display', 
        read_only=True
    )
    post_use_condition_display = serializers.CharField(
        source='get_post_use_condition_display', 
        read_only=True
    )
    actual_duration_days = serializers.SerializerMethodField(read_only=True)
    condition_changed = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ResourceUsage
        fields = '__all__'
        read_only_fields = (
            'created_at', 
            'updated_at',
            'actual_duration_days',
            'condition_changed',
            'pre_use_condition_display',
            'post_use_condition_display'
        )
        extra_kwargs = {
            'requested_quantity': {'min_value': 1},
            'returned_quantity': {'min_value': 0},
            'damaged_quantity': {'min_value': 0},
            'additional_charges': {'min_value': 0},
            'damage_charges': {'min_value': 0},
            'deposit_returned': {'min_value': 0},
        }

    def get_actual_duration_days(self, obj):
        return obj.actual_duration_days

    def get_condition_changed(self, obj):
        return obj.condition_changed

    def validate(self, data):
        allocation = self.instance.allocation if self.instance else data.get('allocation')
        
        if 'returned_quantity' in data and 'damaged_quantity' in data:
            if data['returned_quantity'] + data['damaged_quantity'] > allocation.quantity:
                raise serializers.ValidationError(
                    "Returned + damaged quantity cannot exceed allocated quantity"
                )
        
        if 'actual_start' in data and 'actual_end' in data:
            if data['actual_start'] and data['actual_end']:
                if data['actual_start'] > data['actual_end']:
                    raise serializers.ValidationError(
                        "Actual end time must be after actual start time"
                    )
        
        return data