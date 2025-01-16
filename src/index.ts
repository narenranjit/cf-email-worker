import { EmailMessage } from 'cloudflare:email';
import { build } from 'letterbuilder';

interface Env {
	EMAIL: {
		send: (message: EmailMessage) => Promise<void>;
	};
}

import { WorkerEntrypoint } from 'cloudflare:workers';

export default class WorkerB extends WorkerEntrypoint<Env> {
	async fetch(request: Request): Promise<Response> {
		let json = {};
		try {
			json = await request.json();
		} catch (e) {
			return new Response('Invalid user input', { status: 400 });
		}
		const { from, to, subject, body } = json as { from: string; to: string; subject: string; body: string };
		const email = await this.sendEmail({ from, to, subject, body });
		if (email) {
			return new Response('Email sent', { status: 200 });
		}
		return new Response('Hello', { status: 200 });
	}
	async sendEmail({ from, to, subject, body }: { from: string; to: string; subject: string; body: string }) {
		if (!this.env.EMAIL) {
			throw new Error('Email not configured');
		}
		if (!from || !to || !subject || !body) {
			throw new Error('Insufficient parameters');
		}
		const msg = build({ from, to: [to], subject, text: body });

		const message = new EmailMessage(from, to, msg);
		await this.env.EMAIL.send(message);
		return true;
	}
}
