import { handle } from "@astrojs/cloudflare/handler";
import { handleEmail } from "./email";

export default {
  fetch: handle,

  async email(message: ForwardableEmailMessage, env: Env) {
    await handleEmail(message, env);
  },
} satisfies ExportedHandler<Env>;
