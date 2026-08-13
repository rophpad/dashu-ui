import { readDocument, writeDocument } from "./storage";

export type StoredConversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: unknown[];
};

type ConversationStore = Record<string, Record<string, StoredConversation[]>>;

const MAX_CONVERSATIONS = 50;

function keyForUser(userId: string): string {
  const safeId = userId.replace(/[^a-z0-9-]/gi, "-");
  return `conversations-${safeId}`;
}

export async function readConversations(
  userId: string,
): Promise<Record<string, StoredConversation[]>> {
  return readDocument<Record<string, StoredConversation[]>>(keyForUser(userId), {});
}

export async function writeConversations(
  userId: string,
  value: ConversationStore[string],
): Promise<void> {
  const limited = Object.fromEntries(
    Object.entries(value).map(([workspaceId, conversations]) => [
      workspaceId,
      conversations.slice(0, MAX_CONVERSATIONS),
    ]),
  );
  await writeDocument(keyForUser(userId), limited);
}
