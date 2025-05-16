from django.utils import timezone
from rest_framework import viewsets, status, mixins
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q, F, Case, When, Value, IntegerField,Avg
from django.db.models.functions import Coalesce
from rest_framework.decorators import api_view, permission_classes
from ..models import Edir, Resource, ResourceAllocation, ResourceUsage
from ..serializers import (
    ResourceSerializer, 
    ResourceAllocationSerializer, 
    ResourceUsageSerializer
)
from ..permissions import (
    IsEdirMember,
    IsEdirHead,
    IsPropertyManagerOrHead
   
)

class ResourceViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated, IsEdirMember]

    def get_edir(self):
        return get_object_or_404(Edir, slug=self.kwargs['edir_slug'])

    def get_queryset(self):
        edir = self.get_edir()
        queryset = Resource.objects.filter(edir=edir).select_related('edir')
        
        # Filter by availability if requested
        available = self.request.query_params.get('available', None)
        if available is not None:
            if available.lower() == 'true':
                queryset = queryset.filter(available=True)
            elif available.lower() == 'false':
                queryset = queryset.filter(available=False)
        
        # Filter by category if requested
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
            
        return queryset

    def perform_create(self, serializer):
        edir = self.get_edir()
        serializer.save(edir=edir)

    @action(detail=True, methods=['patch'])
    def toggle_availability(self, request, edir_slug=None, pk=None):
        resource = self.get_object()
        resource.available = not resource.available
        resource.save()
        return Response({'available': resource.available})

    @action(detail=False, methods=['get'])
    def categories(self, request, edir_slug=None):
        edir = self.get_edir()
        categories = Resource.objects.filter(edir=edir).values_list(
            'category', flat=True
        ).distinct()
        return Response({'categories': list(categories)})

    @action(detail=False, methods=['get'])
    def summary(self, request, edir_slug=None):
        edir = self.get_edir()
        summary = Resource.objects.filter(edir=edir).aggregate(
            total_resources=Count('id'),
            total_quantity=Sum('quantity'),
            available_resources=Count('id', filter=Q(available=True)),
            total_value=Sum(
                Case(
                    When(purchase_price__isnull=False, then=F('purchase_price')),
                    default=Value(0),
                    output_field=IntegerField()
                )
            )
        )
        return Response(summary)


class ResourceAllocationViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceAllocationSerializer
    permission_classes = [IsAuthenticated, IsEdirMember]

    def get_edir(self):
        return get_object_or_404(Edir, slug=self.kwargs['edir_slug'])

    def get_queryset(self):
        edir = self.get_edir()
        queryset = ResourceAllocation.objects.filter(
            resource__edir=edir
        ).select_related(
            'resource', 'member', 'approved_by'
        ).prefetch_related('usage')
        
        # Members can only see their own allocations unless they're admins
        if not self.request.user.member.role == "property_manager":
            queryset = queryset.filter(member=self.request.user.member)
            
        # Filter by status if requested
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset

    def perform_create(self, serializer):
        edir = self.get_edir()
        serializer.save(member=self.request.user.member)
        
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManagerOrHead])
    def approve(self, request, edir_slug=None, pk=None):
        allocation = self.get_object()
        if allocation.status != 'pending':
            return Response(
                {'detail': 'Only pending allocations can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        allocation.status = 'approved'
        allocation.approved_by = request.user.member
        allocation.save()
        
        # Create usage record if not exists
        ResourceUsage.objects.get_or_create(
            allocation=allocation,
            defaults={
                'pre_use_condition': allocation.resource.condition,
                'requested_quantity': allocation.quantity
            }
        )
        
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManagerOrHead])
    def reject(self, request, edir_slug=None, pk=None):
        allocation = self.get_object()
        if allocation.status != 'pending':
            return Response(
                {'detail': 'Only pending allocations can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        rejection_reason = request.data.get('rejection_reason', '')
        allocation.status = 'rejected'
        allocation.rejection_reason = rejection_reason
        allocation.approved_by = request.user.member
        allocation.save()
        return Response({'status': 'rejected'})


class ResourceUsageViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceUsageSerializer
    permission_classes = [IsAuthenticated]

    def get_edir(self):
        return get_object_or_404(Edir, slug=self.kwargs['edir_slug'])

    def get_queryset(self):
        edir = self.get_edir()
        queryset = ResourceUsage.objects.filter(
            allocation__resource__edir=edir
        ).select_related(
            'allocation', 
            'allocation__resource',
            'checked_out_by',
            'checked_in_by'
        )
        
        # Filter by condition if requested
        condition = self.request.query_params.get('condition', None)
        if condition:
            queryset = queryset.filter(post_use_condition=condition)
            
        return queryset

    @action(detail=True, methods=['PATCH'])
    def check_in(self, request, edir_slug, pk):
        print('sss',request.user.member.role)
        usage = self.get_object()
        if usage.actual_end:
            return Response(
                {'detail': 'Resource already checked in'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        usage.actual_end = timezone.now()
        usage.post_use_condition = request.data.get('condition', usage.pre_use_condition)
        usage.condition_notes = request.data.get('notes', '')
        usage.returned_quantity = request.data.get('returned_quantity', usage.requested_quantity)
        usage.damaged_quantity = request.data.get('damaged_quantity', 0)
        usage.checked_in_by = request.user.member
        usage.save()
        
        # Update allocation status
        usage.allocation.status = 'returned'
        usage.allocation.save()
        
        return Response({'status': 'checked_in'})
    
    @action(detail=True, methods=['PATCH'])
    def check_out(self, request, edir_slug, pk):
        print('sss',request.user.member.role)
        usage = self.get_object()
        if usage.actual_start:
            return Response(
                {'detail': 'Resource already checked out'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        usage.actual_start = timezone.now()
        usage.pre_use_condition = request.data.get('condition', usage.pre_use_condition)
        usage.condition_notes = request.data.get('notes', '')
        usage.requested_quantity = request.data.get('returned_quantity', usage.requested_quantity)
        usage.checked_out_by = request.user.member
        usage.save()
        
        # Update allocation status
        usage.allocation.status = 'rented'
        usage.allocation.save()
        
        return Response({'status': 'checked_out'})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsEdirMember])
def resource_utilization_report(request, edir_slug):
    edir = get_object_or_404(Edir, slug=edir_slug)
    
    # Resource utilization summary with more detailed metrics
    resources = Resource.objects.filter(edir=edir).annotate(
        allocation_count=Count('allocations'),
        allocated_quantity=Coalesce(Sum('allocations__quantity'), 0),
        pending_allocations=Count(
            'allocations',
            filter=Q(allocations__status='pending')
        ),
        active_allocations=Count(
            'allocations',
            filter=Q(allocations__status='approved')
        ),
        total_rental_income=Sum(
            'allocations__actual_cost',
            filter=Q(allocations__status='approved')
        )
    )
    
    # Allocation status breakdown with time periods
    status_counts = ResourceAllocation.objects.filter(
        resource__edir=edir
    ).values('status').annotate(
        count=Count('id'),
        total_quantity=Sum('quantity'),
        avg_duration=Avg(F('end_date') - F('start_date'))
    )
    
    # Financial summary
    financial_summary = {
        'total_purchase_value': Resource.objects.filter(edir=edir).aggregate(
            total=Sum('purchase_price')
        )['total'] or 0,
        'total_rental_income': ResourceAllocation.objects.filter(
            resource__edir=edir,
            status='approved'
        ).aggregate(
            total=Sum('actual_cost')
        )['total'] or 0,
        'total_damage_charges': ResourceUsage.objects.filter(
            allocation__resource__edir=edir
        ).aggregate(
            total=Sum('damage_charges')
        )['total'] or 0
    }
    
    return Response({
        'edir': edir.name,
        'resource_summary': [
            {
                'id': r.id,
                'name': r.name,
                'category': r.category,
                'total_quantity': r.quantity,
                'allocated_quantity': r.allocated_quantity,
                'utilization_rate': round((r.allocated_quantity / r.quantity * 100), 2) if r.quantity > 0 else 0,
                'pending_requests': r.pending_allocations,
                'active_allocations': r.active_allocations,
                'rental_income': r.total_rental_income or 0
            } 
            for r in resources
        ],
        'allocation_status': list(status_counts),
        'financial_summary': financial_summary,
        'last_updated': timezone.now()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsEdirHead])
def resource_maintenance_report(request, edir_slug):
    edir = get_object_or_404(Edir, slug=edir_slug)
    
    # Resources needing maintenance
    maintenance_needed = Resource.objects.filter(
        edir=edir,
        last_maintenance_date__lt=timezone.now() - timezone.timedelta(
            days=F('maintenance_frequency')
        )
    ).annotate(
        days_overdue=timezone.now() - F('last_maintenance_date')
    )
    
    # Damaged resources
    damaged_resources = ResourceUsage.objects.filter(
        allocation__resource__edir=edir,
        post_use_condition__in=['poor', 'damaged']
    ).select_related('allocation__resource').values(
        'allocation__resource__name',
        'post_use_condition',
        'condition_notes'
    ).distinct()
    
    return Response({
        'maintenance_needed': [
            {
                'id': r.id,
                'name': r.name,
                'last_maintenance': r.last_maintenance_date,
                'days_overdue': r.days_overdue.days,
                'condition': r.condition
            }
            for r in maintenance_needed
        ],
        'damaged_resources': list(damaged_resources)
    })