"use client";

import { useContext, useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Conversation } from "@prisma/client";
import { ChatContext } from "@/context/ChatContext";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import SettingsModal from "@/components/settings/SettingsModal";
import { useRouter } from "next/navigation";
import RenderList from "./conversations/RenderList";

type ConversationWithLoading = Conversation & {
  isLoading?: boolean;
  isRetry?: boolean;
};

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  conversations: ConversationWithLoading[];
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({
  isOpen = false,
  onClose,
  isMobile = false,
}: SidebarProps) {
  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();
  const { conversations, activeUser, setConversationId, setMessages } =
    useContext(ChatContext);
  const [searchResults, setSearchResults] =
    useState<ConversationWithLoading[]>(conversations);

  useEffect(() => {
    if (searchValue) {
      setSearchResults(
        conversations.filter((conversation) =>
          conversation.title.toLowerCase().includes(searchValue.toLowerCase())
        )
      );
    } else {
      setSearchResults(conversations);
    }
  }, [searchValue, conversations]);

  const filteredPinnedConversations = searchResults.filter(
    (conv) => conv.isPinned
  );
  const filteredUnpinnedConversations = searchResults.filter(
    (conv) => !conv.isPinned
  );

  return (
    <>
      {/* Sidebar - Toggleable on all screen sizes */}
      <div
        className={`${
          isOpen ? "flex" : "hidden"
        } w-[17rem] flex-col h-screen fixed md:relative inset-y-0 left-0 z-50 md:z-auto bg-sidebar md:bg-transparent`}
      >
        <div className="inset-y-0 transition-[transform,opacity] ease-snappy flex left-0 group-data-[collapsible=offcanvas]:-translate-x-[var(--sidebar-width)] p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)] group border-none flex-1">
          <div className="flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow">
            {/* Header */}
            {/* T720 FIXME: the top attribute doesn't work yet! */}
            {/* T720 FIXME: the color is wrong in light mode */}
            <div className="m-1 justify-center flex pb-0 flex-shrink-0 relative">
              <div className="flex h-[32px] items-center justify-center">
                <svg className="w-[65.4333px] h-[14px] fill-[#e3bad1]" viewBox="0 0 247.7 53"><path d="M35.8 10.7H24v40.9h-8.6V10.8H0V3.4h43zm136.4 9.4c1.3 2.5 1.9 5.4 1.9 8.9v22.6h-8.5V30.2c0-3.2-.7-5.7-2.3-7.4s-3.7-2.5-6.4-2.5-4.8.8-6.4 2.5c-1.6 1.6-2.4 4.1-2.4 7.3v21.5h-8.6V8.9l8.6-8.8v16.5c1.2-1.1 2.6-2.1 4.2-2.8 2.1-.8 4.3-1.3 6.7-1.3 2.8 0 5.4.6 7.7 1.9l.1.1c2.2 1.2 4 3.1 5.4 5.6zM44.4 10.6l7.1-7.2h21.9v6.4L62.6 21c3.8.5 6.9 1.9 9.1 4.2l.2.2c2.5 2.6 3.7 6.1 3.9 10.5 0 4.7-1.5 8.5-4.4 11.3s-6.9 4.2-11.9 4.2c-4.6 0-8.4-1.3-11.3-3.7-3-2.4-4.6-5.9-4.8-10.5v-.5h8.1v.5c.2 2.1.9 3.8 2.3 5.2 1.3 1.3 3.2 2 5.7 2s4.5-.7 5.9-2.2 2.1-3.6 2.1-6.2c0-2.7-.7-4.7-2.1-6.1-1.5-1.5-3.4-2.2-5.9-2.2h-7v-5.9l10.6-11.2zm202.4 2.6v7.3h-9v22.7l-5.8 6-2.9 2.9V20.5h-4.3v-7.3h4.3V3.9h8.7v9.3zm-140.9 1.9c2.8-1.7 6-2.5 9.6-2.5 4.6 0 8.4 1.1 11.4 3.3s5.1 5.4 6.1 9.5l.1.5H124l-.1-.3c-.7-1.8-1.7-3.2-3.1-4.2s-3.1-1.5-5.3-1.5c-3 0-5.4 1-7.2 3.2s-2.7 5.2-2.7 9.2.9 7.1 2.7 9.3 4.2 3.3 7.2 3.3c2.2 0 3.9-.5 5.3-1.4 1.4-1 2.4-2.4 3.1-4.3l.1-.3h9.1l-.1.5c-1.1 3.9-3.2 7-6.2 9.3-3.1 2.3-6.8 3.5-11.3 3.5-3.6 0-6.8-.8-9.6-2.5s-5-4-6.6-7-2.4-6.5-2.4-10.4.8-7.4 2.4-10.4l.3-.5c1.5-2.8 3.6-5 6.3-6.3zm91.9 37c-3.2 0-6.2-.9-8.9-2.6s-4.8-4.1-6.4-7.1-2.4-6.5-2.4-10.3.8-7.2 2.4-10.2c1.5-2.9 3.7-5.2 6.4-6.9s5.7-2.5 9-2.5c3 0 5.6.6 7.8 1.8 1.8.9 3.4 2.1 4.6 3.5v-4.7h8.5v38.4h-8.5v-4.8c-1.2 1.4-2.8 2.6-4.7 3.6-2.3 1.2-5 1.8-7.8 1.8zm6.9-30.6c-1.6-.9-3.4-1.4-5.3-1.4s-3.7.4-5.3 1.4c-1.7.9-3 2.3-4 4.1s-1.5 4-1.5 6.5.5 4.7 1.5 6.6 2.3 3.3 4 4.3 3.4 1.5 5.3 1.5 3.7-.5 5.3-1.5c1.6-.9 3-2.3 4-4.2s1.5-4.1 1.5-6.6c0-2.3-.4-4.3-1.2-6l-.3-.5c-1-1.8-2.3-3.2-4-4.2zM84.3 44.2h6.9v6.9h-6.9z"></path></svg>
              </div>
            </div>
            {/* T720: add some padding */}
            <span className="pt-1"></span>
            <div className="flex flex-col gap-2 relative m-1 mb-0 space-y-1 p-0 !pt-safe flex-shrink-0">
              <div className="px-1">
                <Button
                  variant="callToAction"
                  className="w-full pb-4"
                  onClick={() => {
                    setConversationId(null);
                    setMessages([]);
                    router.push("/chat");
                  }}
                >
                  <span className="w-full select-none text-center text-sm">
                    New Chat
                  </span>
                </Button>
              </div>

              <div className="border-b px-3">
                <div className="flex items-center">
                  <Search className="-ml-[3px] mr-3 !size-4 text-muted-foreground" />
                  <Input
                    role="searchbox"
                    aria-label="Search threads"
                    placeholder="Search your threads..."
                    className="w-full bg-transparent py-2 text-sm text-foreground placeholder-muted-foreground/50 placeholder:select-none focus:outline-none border-none"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Conversation List */}
            <RenderList
              filteredPinnedConversations={filteredPinnedConversations}
              filteredUnpinnedConversations={filteredUnpinnedConversations}
              isMobile={isMobile}
              onClose={onClose || (() => {})}
            />

            {/* Footer */}
            <div className="flex flex-col gap-2 m-0 p-2 pt-0 justify-end flex-shrink-0">
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    aria-label="Go to settings"
                    className="flex select-none flex-row items-center justify-between gap-3 rounded-lg px-3 py-3 hover:bg-sidebar-accent focus:bg-sidebar-accent focus:outline-2 w-full text-left"
                  >
                    <div className="flex w-full min-w-0 flex-row items-center gap-3">
                      {activeUser?.image ? (
                        <Image
                          alt={activeUser.name || "User"}
                          loading="lazy"
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full ring-1 ring-muted-foreground/20"
                          src={activeUser.image}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center ring-1 ring-muted-foreground/20">
                          <span className="text-sm font-medium">
                            {activeUser?.username?.[0] ||
                              activeUser?.name?.[0] ||
                              "U"}
                          </span>
                        </div>
                      )}
                      <div className="flex min-w-0 flex-col text-foreground">
                        <span className="truncate text-sm font-medium">
                          {activeUser?.username || activeUser?.name || "User"}
                        </span>
                        <span className="text-xs">OSS FREE FOR EVER</span>
                      </div>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent
                  aria-describedby={undefined}
                  className="h-[90vh] w-[90vw] max-w-[90vw] max-sm:h-[90vh] max-sm:w-[90vw]"
                >
                  <DialogTitle className="sr-only">Settings</DialogTitle>
                  <SettingsModal />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
