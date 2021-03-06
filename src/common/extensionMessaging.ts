// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import * as Q from "q";
import * as net from "net";

export let ErrorMarker = "vscode-cordova-error-marker";

/**
 * Defines the messages sent to the extension.
 * Add new messages to this enum.
 */
export enum ExtensionMessage {
    SEND_TELEMETRY
}

export interface MessageWithArguments {
    message: ExtensionMessage;
    args: any[];
}

/**
 * Sends messages to the extension.
 */
export class ExtensionMessageSender {
    public static getExtensionPipePath(): string {
        switch (process.platform) {
            case "win32":
                return "\\\\?\\pipe\\vscodecordova";
            default:
                return "/tmp/vscodecordova.sock";
        }
    }

    public sendMessage(message: ExtensionMessage, args?: any[]): Q.Promise<any> {
        let deferred = Q.defer<any>();
        let messageWithArguments: MessageWithArguments = { message: message, args: args };
        let body = "";

        let pipePath = ExtensionMessageSender.getExtensionPipePath();
        let socket = net.connect(pipePath, function() {
            let messageJson = JSON.stringify(messageWithArguments);
            socket.write(messageJson);
        });

        socket.on("data", function(data: any) {
            body += data;
        });

        socket.on("error", function(data: any) {
            deferred.reject(new Error("An error ocurred while handling message: " + ExtensionMessage[message]));
        });

        socket.on("end", function() {
            try {
                if (body === ErrorMarker) {
                    deferred.reject(new Error("An error ocurred while handling message: " + ExtensionMessage[message]));
                } else {
                    let responseBody: any = body ? JSON.parse(body) : null;
                    deferred.resolve(responseBody);
                }
            } catch (e) {
                deferred.reject(e);
            }
        });

        return deferred.promise;
    }
}
