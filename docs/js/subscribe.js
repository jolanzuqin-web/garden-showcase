// Подписка на ежемесячные рекомендации в Telegram.
const NOTIFY_CONFIG = {
  TELEGRAM_BOT_USERNAME: 'garden_calendar_notify_bot',
};

function subscribeWidget() {
  return {
    region: '',
    userChangedRegion: false,

    telegramLink() {
      const region = this.region || window.SITE_CONFIG.defaultRegionId;
      return `https://t.me/${NOTIFY_CONFIG.TELEGRAM_BOT_USERNAME}?start=${region}`;
    },
  };
}
