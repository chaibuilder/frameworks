import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  registerBlockSettingField,
  useAddBlock,
  useBlocksStore,
  useRemoveBlocks,
  useSelectedBlock,
  useSelectedBlockIds,
  useWrapperBlock,
} from "chai-next";
import {
  ChaiBlock,
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  runtimeProp,
  stylesProp,
} from "chai-next/blocks";
import { PlusCircle, Trash } from "lucide-react";
import React, { useEffect } from "react";
// Register Field
const TabsField = ({ formData, onChange }: { formData: any; onChange: any }) => {
  const [allBlocks] = useBlocksStore();
  const selectedBlock = useSelectedBlock();
  const wrapperBlock = useWrapperBlock();
  const { addCoreBlock } = useAddBlock();
  const removeBlock = useRemoveBlocks();
  const [, setBlockIds] = useSelectedBlockIds();

  const tabsBlock = selectedBlock?._type === "Shadcn/Tabs" ? selectedBlock : wrapperBlock;
  const tabListBlock = allBlocks?.find((block) => block._parent === tabsBlock?._id && block._type === "Shadcn/TabList");
  const tabItemBlocks = allBlocks?.filter(
    (block) => block._parent === tabListBlock?._id && block._type === "Shadcn/TabItem",
  );
  const tabContentBlocks = allBlocks?.filter(
    (block) => block._parent === tabsBlock?._id && block._type === "Shadcn/TabContent",
  );
  const currentTab = formData?.currentTab || tabItemBlocks?.[0]?.value;

  useEffect(() => {
    if (selectedBlock?._type === "Shadcn/TabContent" && formData?.currentTab !== selectedBlock?.value) {
      onChange({ ...formData, currentTab: selectedBlock?.value });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlock]);

  useEffect(() => {
    if (tabItemBlocks?.length && !tabItemBlocks.find((block) => block.value === formData?.currentTab)) {
      onChange({ ...formData, currentTab: tabItemBlocks?.[0]?.value });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, tabItemBlocks]);

  if (!selectedBlock && !wrapperBlock) return null;
  if (!tabListBlock) return null;

  const addNewTab = () => {
    const itemNumber = tabItemBlocks.length + 1;
    const tabValue = `tab-${itemNumber}`;
    console.log("##", { tabValue });

    // * Add new tab item
    addCoreBlock(
      {
        type: "Shadcn/TabItem",
        _name: `Tab Item ${itemNumber}`,
        content: `Tab ${itemNumber}`,
        value: tabValue,
      },
      tabListBlock?._id,
    );

    // * Add new tab content
    const newTabContent = addCoreBlock(
      {
        type: "Shadcn/TabContent",
        _name: `Tab Content ${itemNumber}`,
        value: tabValue,
      },
      tabsBlock?._id,
    );

    // * Add paragraph inside tab content
    addCoreBlock(
      {
        type: "Paragraph",
        content: `Tab ${itemNumber} Content`,
      },
      newTabContent?._id,
    );

    onChange({ ...formData, currentTab: tabValue });
    setBlockIds([newTabContent?._id]);
  };

  const deleteTab = (tabItem: { _id: string; value: string }) => {
    const tabContent = tabContentBlocks.find((content) => content.value === tabItem.value);
    const tabContentChildren = allBlocks.filter((block) => block._parent === tabContent?._id);

    if (!tabContent) return;

    const blocksToRemove = [tabItem._id, tabContent._id, ...tabContentChildren.map((child) => child._id)];
    removeBlock(blocksToRemove);
  };

  return (
    <div>
      <div className="space-y-0.5">
        <div className="flex w-full items-center justify-between pb-2">
          <div className="pl-2 text-xs font-medium">Tabs</div>
          <button
            onClick={addNewTab}
            className="flex items-center justify-center gap-x-1 rounded border bg-gray-100 px-4 py-1 text-xs font-medium leading-tight hover:opacity-80">
            <PlusCircle className="h-3 w-3 stroke-[2]" />
            Add Tab
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {tabItemBlocks?.map((block, index) => (
            <div
              key={block?._id}
              onClick={() => {
                onChange({ ...formData, currentTab: block?.value });
                const tabContent = tabContentBlocks.find((content) => content.value === block.value);
                if (tabContent) {
                  setBlockIds([tabContent._id]);
                }
              }}
              className="flex cursor-pointer items-center justify-between rounded border bg-slate-100 p-2 text-xs leading-tight hover:opacity-80">
              <div className="flex items-center gap-x-2 leading-tight">
                <div
                  className={`h-4 w-4 rounded-full border-gray-300 ${currentTab === block?.value ? "border-2 bg-blue-500" : "border-4"}`}
                />
                {block.title || `Tab ${index + 1}`}
              </div>
              <div>
                <Trash
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTab(block);
                  }}
                  className="h-3 w-3 opacity-70 duration-300 hover:opacity-100"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
registerBlockSettingField("tabs", TabsField);

// Simple context to render TabItem twice: once for triggers and once for contents
const TabsRenderContext = React.createContext<"trigger" | "content" | null>(null);

const ShadcnTabs = (
  props: ChaiBlockComponentProps<{
    defaultValue?: string;
    orientation?: "horizontal" | "vertical";
    tabsStyles: ChaiStyles;
  }>,
) => {
  const children = props.children as React.ReactNode;

  return (
    <Tabs defaultValue={props.defaultValue} orientation={props.orientation} {...props.blockProps} {...props.tabsStyles}>
      <TabsRenderContext.Provider value="trigger">{children}</TabsRenderContext.Provider>
      <TabsRenderContext.Provider value="content">{children}</TabsRenderContext.Provider>
    </Tabs>
  );
};

const ShadcnTabItem = (
  props: ChaiBlockComponentProps<{
    content: string;
    value: string;
    triggerStyles: ChaiStyles;
    activeTriggerStyles: ChaiStyles;
    tabItemWrapperStyles: ChaiStyles;
  }>,
) => {
  const mode = React.useContext(TabsRenderContext);

  if (mode === "trigger") {
    const baseClass = (props.triggerStyles as any)?.className as string | undefined;
    const activeClass = (props.activeTriggerStyles as any)?.className as string | undefined;
    const prefixedActive = activeClass
      ? activeClass
          .split(/\s+/)
          .filter(Boolean)
          .map((c) => `data-[state=active]:${c}`)
          .join(" ")
      : undefined;
    return (
      <div {...props.blockProps} {...props.tabItemWrapperStyles}>
        <TabsTrigger value={props.value} {...props.triggerStyles} className={cn(baseClass, prefixedActive)}>
          {props.children || props.content}
        </TabsTrigger>
      </div>
    );
  }

  // In content pass, TabItem doesn't render anything; TabContent will handle it
  if (mode === "content") return null;

  // Fallback (shouldn't render outside Tabs)
  return null;
};

registerChaiBlock(ShadcnTabItem, {
  type: "Shadcn/TabItem",
  label: "Tab Item",
  category: "core",
  group: "Shadcn",
  hidden: true,
  ...registerChaiBlockSchema({
    properties: {
      triggerStyles: stylesProp(""),
      activeTriggerStyles: stylesProp(""),
      tabItemWrapperStyles: stylesProp(""),
      content: {
        type: "string",
        title: "Content",
        default: "Tab",
      },
      value: {
        type: "string",
        title: "Value",
        default: "tab-1",
      },
    },
  }),
  i18nProps: ["content"],
  aiProps: ["content"],
  canAcceptBlock: () => true,
});

// TabList block: renders only in trigger pass and holds TabItem children
const ShadcnTabList = (
  props: ChaiBlockComponentProps<{
    listStyles: ChaiStyles;
  }>,
) => {
  const mode = React.useContext(TabsRenderContext);
  if (mode === "trigger") {
    return (
      <TabsList {...props.blockProps} {...props.listStyles}>
        {props.children}
      </TabsList>
    );
  }
  return null;
};

registerChaiBlock(ShadcnTabList, {
  type: "Shadcn/TabList",
  label: "Tab List",
  category: "core",
  group: "Shadcn",
  hidden: true,
  ...registerChaiBlockSchema({
    properties: {
      listStyles: stylesProp(""),
    },
  }),
  canAcceptBlock: (type) => ["Shadcn/TabItem"].includes(type),
});

// Separate block for Tabs Content
const ShadcnTabContent = (
  props: ChaiBlockComponentProps<{
    value: string;
    contentStyles: ChaiStyles;
    itemStyles: ChaiStyles;
    contentWrapperStyles: ChaiStyles;
  }>,
) => {
  const mode = React.useContext(TabsRenderContext);
  if (mode === "content") {
    return (
      <div {...props.blockProps} {...props.contentWrapperStyles}>
        <TabsContent value={props.value}>
          <div {...props.itemStyles}>{props.children}</div>
        </TabsContent>
      </div>
    );
  }
  // In trigger pass, content is not rendered
  return null;
};

registerChaiBlock(ShadcnTabContent, {
  type: "Shadcn/TabContent",
  label: "Tab Content",
  category: "core",
  group: "Shadcn",
  hidden: true,
  ...registerChaiBlockSchema({
    properties: {
      value: {
        type: "string",
        title: "Value",
        default: "tab-1",
      },
      contentStyles: stylesProp(""),
      itemStyles: stylesProp(""),
      contentWrapperStyles: stylesProp(""),
    },
  }),
  canAcceptBlock: () => true,
});

registerChaiBlock(ShadcnTabs, {
  type: "Shadcn/Tabs",
  label: "Tabs",
  category: "core",
  group: "Shadcn",
  wrapper: true,
  canAcceptBlock: (type) => ["Shadcn/TabItem", "Shadcn/TabContent"].includes(type),
  blocks: () => {
    return [
      {
        _id: "tabs-root",
        _type: "Shadcn/Tabs",
        defaultValue: "tab-1",
        orientation: "horizontal",
      },
      {
        _id: "tabs-list-1",
        _type: "Shadcn/TabList",
        _parent: "tabs-root",
      },
      {
        _id: "tabs-item-1",
        _type: "Shadcn/TabItem",
        _parent: "tabs-list-1",
        _name: "Tab Item 1",
        title: "Tab 1",
        value: "tab-1",
      },
      {
        _id: "tabs-content-1",
        _type: "Shadcn/TabContent",
        _parent: "tabs-root",
        _name: "Tab Content 1",
        value: "tab-1",
      },
      {
        _id: "tabs-content-1-text",
        _type: "Paragraph",
        _parent: "tabs-content-1",
        content: "Tab 1 Content. Replace this with your content.",
      },
    ] as ChaiBlock[];
  },
  ...registerChaiBlockSchema({
    properties: {
      tabsStyles: stylesProp(""),
      tabs: runtimeProp({
        type: "object",
        properties: {},
        default: {
          currentTab: null,
        },
        ui: {
          "ui:field": "tabs",
        },
      }),
      defaultValue: {
        type: "string",
        title: "Default Value",
        default: "tab-1",
      },
      orientation: {
        type: "string",
        title: "Orientation",
        enum: ["horizontal", "vertical"],
        default: "horizontal",
      },
    },
  }),
});
