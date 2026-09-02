import API from "./api";

// Backend response: { success: true, data: { message: "answer text" } }
export const sendMessage = async (message: string): Promise<{ message: string }> => {
  const res = await API.post("/chat/message", { message }, { timeout: 25000 });
  if (res.data?.data?.message) {
    return { message: res.data.data.message };
  }
  if (typeof res.data?.message === "string") {
    return { message: res.data.message };
  }
  return { message: "Thank you for reaching out! How else can I assist you with EduReach admissions?" };
};