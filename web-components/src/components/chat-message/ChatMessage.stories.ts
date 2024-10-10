/**
 * Copyright (c) Cisco Systems, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import "@/components/chat-message/ChatMessage";
import { Args } from "@storybook/web-components";
import { html } from "lit";

export default {
  title: "Components/Chat Message",
  component: "md-chat-message",
  argTypes: {
    title: { control: "text", defaultValue: "John Doe" },
    message: { control: "text", defaultValue: "I have issue with my silencer" },
    selfMode: { control: "boolean", defaultValue: false }
  },
  parameters: {
    a11y: {
      element: "md-chat-message"
    }
  }
};

export const ChatMessage = (args: Args) => {
  return html`
    <md-chat-message .self=${args.selfMode} title=${args.title} time="11:27AM">
      <p slot="message">${args.message}</p>
    </md-chat-message>
  `;
};
