# Generated by Django 5.2 on 2025-04-09 11:24

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0010_alter_member_registration_type_role'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='member',
            name='date_applied',
        ),
        migrations.AddField(
            model_name='member',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='member',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='member',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='member',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
