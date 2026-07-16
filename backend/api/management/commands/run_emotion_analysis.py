from django.core.management.base import BaseCommand

from api.services import EmotionAnalysisService


class Command(BaseCommand):
    help = "Run batch emotion analysis on completed webcam recordings"

    def add_arguments(self, parser):
        parser.add_argument(
            "--trigger",
            type=str,
            default="cron",
            choices=["cron", "manual"],
            help="Trigger type recorded in the analysis run log.",
        )

    def handle(self, *args, **options):
        trigger = options.get("trigger", "cron")
        self.stdout.write(f"Starting emotion analysis (trigger={trigger})...")
        run_log = EmotionAnalysisService.run(trigger=trigger)
        self.stdout.write(
            f"Emotion analysis finished: status={run_log.status} "
            f"processed={run_log.processed}/{run_log.total}"
        )
