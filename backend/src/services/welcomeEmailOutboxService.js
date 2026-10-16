const { performance } = require("node:perf_hooks");
const prisma = require("../config/prisma");
const { sendEmail } = require("./emailService");

const POLL_INTERVAL_MS = 15000;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const INITIAL_RETRY_DELAY_MS = 30000;
const MAX_RETRY_DELAY_MS = 6 * 60 * 60 * 1000;
const BATCH_SIZE = 10;

let isProcessing = false;
let workerInterval;

const getRetryDelay = (attempt) =>
  Math.min(
    INITIAL_RETRY_DELAY_MS * 2 ** Math.min(attempt - 1, 10),
    MAX_RETRY_DELAY_MS,
  );

const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: "Welcome to Bolo India 🇮🇳",
    text: `Welcome to Bolo India, ${user.name}! Your account has been created successfully.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to Bolo India 🇮🇳</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Your Bolo India account has been created successfully.</p>
        <p>You can now log in and start sharing your thoughts, ideas and moments with India.</p>
        <p>Thank you for joining Bolo India!</p>
        <br />
        <p>Regards,<br /><strong>Bolo India Team</strong></p>
      </div>
    `,
  });

const deliverQueuedEmail = async (queuedEmail, now, staleLockBefore) => {
  const claim = await prisma.welcomeEmailOutbox.updateMany({
    where: {
      id: queuedEmail.id,
      sentAt: null,
      nextAttemptAt: { lte: now },
      OR: [{ lockedAt: null }, { lockedAt: { lt: staleLockBefore } }],
    },
    data: {
      lockedAt: now,
      attempts: { increment: 1 },
    },
  });

  if (claim.count !== 1) {
    return;
  }

  const attempt = queuedEmail.attempts + 1;
  const sendStartedAt = performance.now();

  try {
    await sendWelcomeEmail(queuedEmail.user);
  } catch (emailError) {
    const retryAt = new Date(Date.now() + getRetryDelay(attempt));

    try {
      await prisma.welcomeEmailOutbox.update({
        where: { id: queuedEmail.id },
        data: {
          lockedAt: null,
          nextAttemptAt: retryAt,
          lastError: String(emailError.message || emailError).slice(0, 1000),
        },
      });
    } catch (queueError) {
      console.error(
        `[Welcome email] Failed to persist retry for outbox ${queuedEmail.id}:`,
        queueError,
      );
      return;
    }

    console.error(
      `[Welcome email] Delivery attempt ${attempt} failed for outbox ${queuedEmail.id}; retry scheduled at ${retryAt.toISOString()}:`,
      emailError,
    );
    return;
  }

  try {
    await prisma.welcomeEmailOutbox.update({
      where: { id: queuedEmail.id },
      data: {
        sentAt: new Date(),
        lockedAt: null,
        lastError: null,
      },
    });
    console.info(
      `[Welcome email] Delivered outbox ${queuedEmail.id} in ${(performance.now() - sendStartedAt).toFixed(1)}ms`,
    );
  } catch (queueError) {
    console.error(
      `[Welcome email] Delivery succeeded but outbox ${queuedEmail.id} could not be marked sent; it may be retried:`,
      queueError,
    );
  }
};

const processWelcomeEmailOutbox = async () => {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    const now = new Date();
    const staleLockBefore = new Date(now.getTime() - LOCK_TIMEOUT_MS);
    const queuedEmails = await prisma.welcomeEmailOutbox.findMany({
      where: {
        sentAt: null,
        nextAttemptAt: { lte: now },
        OR: [{ lockedAt: null }, { lockedAt: { lt: staleLockBefore } }],
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
      take: BATCH_SIZE,
    });

    for (const queuedEmail of queuedEmails) {
      await deliverQueuedEmail(queuedEmail, now, staleLockBefore);
    }
  } catch (error) {
    console.error("[Welcome email] Outbox processing failed:", error);
  } finally {
    isProcessing = false;
  }
};

const scheduleWelcomeEmailDelivery = () => {
  setImmediate(() => {
    void processWelcomeEmailOutbox();
  });
};

const startWelcomeEmailWorker = () => {
  if (workerInterval) {
    return;
  }

  scheduleWelcomeEmailDelivery();
  workerInterval = setInterval(() => {
    void processWelcomeEmailOutbox();
  }, POLL_INTERVAL_MS);
  workerInterval.unref();
};

module.exports = {
  scheduleWelcomeEmailDelivery,
  startWelcomeEmailWorker,
};
