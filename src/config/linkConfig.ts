export interface LinkConfig {
  enableAutoLinking: boolean;
  enableTicketLinks: boolean;
  enableDocumentLinks: boolean;
}

const defaultLinkConfig: LinkConfig = {
  enableAutoLinking: true,
  enableTicketLinks: true,
  enableDocumentLinks: true,
};

const LINK_CONFIG_KEY = 'markdown-ticket-link-config';

export function getLinkConfig(): LinkConfig {
  try {
    const stored = localStorage.getItem(LINK_CONFIG_KEY);
    if (stored) {
      return { ...defaultLinkConfig, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load link config:', error);
  }
  return defaultLinkConfig;
}

function setLinkConfig(config: Partial<LinkConfig>): void {
  try {
    const current = getLinkConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(LINK_CONFIG_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save link config:', error);
  }
}
