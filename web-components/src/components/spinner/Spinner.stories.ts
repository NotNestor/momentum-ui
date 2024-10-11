/**
 * Copyright (c) Cisco Systems, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import "@/components/spinner/Spinner";
import { Args } from "@storybook/web-components";
import { html } from "lit";

export default {
  title: "Components/Spinner",
  component: "md-spinner",
  argTypes: {
    size: { control: "number", defaultValue: 20 },
    spinnerStyleMap: { table: { disable: true } }
  },
  parameters: {
    a11y: {
      element: "md-spinner"
    }
  }
};

export const Spinner = (args: Args) => {
  return html` <md-spinner .size="${args.size}"></md-spinner> `;
};
