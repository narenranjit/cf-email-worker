import { createMimeMessage } from 'mimetext';
interface Env {
	EMAIL: {
		send: (message: EmailMessage) => Promise<void>;
	};
}

import { WorkerEntrypoint } from 'cloudflare:workers';

export default class EmailSendWorker extends WorkerEntrypoint<Env> {
	async fetch(request: Request): Promise<Response> {
		let json = {};
		try {
			json = await request.json();
		} catch (e) {
			console.error('Invalid input', e);
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
			console.error('Email not configured');
			throw new Error('Email not configured');
		}
		if (!from || !to || !subject || !body) {
			console.error('Insufficient parameters', { from, to, subject, body });
			throw new Error('Insufficient parameters');
		}

		try {
			const cfMail = await import('cloudflare:email');
			const msg = createMimeMessage();
			msg.setSender({ name: from, addr: from });
			msg.setRecipient(to);
			msg.setSubject(subject);
			msg.addMessage({
				contentType: 'text/plain',
				data: body,
			});
			console.log('Sending email', { from, to, subject, body }, msg.asRaw());
			const message = new cfMail.EmailMessage(from, to, msg.asRaw());
			await this.env.EMAIL.send(message);
			console.log('Email sent!', { from, to, subject, body });
		} catch (e) {
			console.error('Email send error', e);
			return false;
		}
		return true;
	}
}
