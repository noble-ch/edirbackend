# Generated by Django 5.2 on 2025-05-27 18:05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0005_alter_reminder_channel_alter_reminder_created_by_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payment',
            name='payment_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]
