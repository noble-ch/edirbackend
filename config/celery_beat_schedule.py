from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'send-reminders-on-1st': {
        'task': 'your_app.tasks.send_monthly_reminders',
        'schedule': crontab(day_of_month='1', hour=8, minute=0),
    },
    'check-late-payments-on-3rd': {
        'task': 'your_app.tasks.check_late_payments',
        'schedule': crontab(day_of_month='3', hour=8, minute=0),
    },
}