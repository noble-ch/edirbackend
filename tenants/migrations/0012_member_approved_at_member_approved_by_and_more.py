# Generated by Django 5.2 on 2025-04-10 12:08

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0011_remove_member_date_applied_member_created_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='member',
            name='approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='member',
            name='approved_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_members', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='member',
            name='is_approved',
            field=models.BooleanField(default=False),
        ),
    ]
