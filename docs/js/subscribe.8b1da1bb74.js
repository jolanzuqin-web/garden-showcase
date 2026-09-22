// Подписка на ежемесячные рекомендации — Telegram-каналы по регионам.
const NOTIFY_CONFIG = {
  GENERAL_CHANNEL: 'posadu_ru',
  REGION_CHANNELS: {
    'srednyaya-polosa': 'posadu_ru_SP',
    yug: 'posadu_ru_YUG',
    'ural-sibir': 'posadu_ru_URAL',
    'severo-zapad': 'posadu_ru_SZ',
  },
};

function subscribeWidget() {
  return {
    region: '',
    userChangedRegion: false,

    telegramLink() {
      const region = this.region || window.SITE_CONFIG.defaultRegionId;
      const channel = NOTIFY_CONFIG.REGION_CHANNELS[region] || NOTIFY_CONFIG.GENERAL_CHANNEL;
      return `https://t.me/${channel}`;
    },
  };
}
