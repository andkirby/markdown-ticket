import type { DocumentFilenameTab } from './documentFilenameTabModel'
import * as Tabs from '@radix-ui/react-tabs'

interface DocumentFilenameTabsProps {
  tabs: DocumentFilenameTab[]
  activeTabKey: string
  onSelectTab: (filePath: string) => void
}

export default function DocumentFilenameTabs({
  tabs,
  activeTabKey,
  onSelectTab,
}: DocumentFilenameTabsProps) {
  if (tabs.length === 0) {
    return null
  }

  return (
    <Tabs.Root
      value={activeTabKey}
      onValueChange={(value) => {
        const selectedTab = tabs.find(tab => tab.key === value)
        if (selectedTab) {
          onSelectTab(selectedTab.filePath)
        }
      }}
    >
      <Tabs.List
        data-testid="document-filename-tabs"
        className="tab__list overflow-x-auto scrollbar-hide"
      >
        {tabs.map(tab => (
          <Tabs.Trigger
            key={tab.key}
            value={tab.key}
            data-testid={`document-filename-tab-${tab.key}`}
            className="tab mr-3 last:mr-0"
            onClick={() => onSelectTab(tab.filePath)}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  )
}
