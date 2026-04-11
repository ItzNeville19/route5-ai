export type RelayMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts?: number;
};
