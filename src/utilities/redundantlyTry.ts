/**
 * Retries a callback function with exponential backoff.
 *
 * @param callback - Function to execute with retry logic
 * @param options - Configuration for retry behavior
 * @returns Promise that resolves on first success or rejects after all attempts fail
 *
 * @example
 * ```typescript
 * await redundantlyTry(
 *   async () => {
 *     await socket.send(buffer, address);
 *   },
 *   { retryCount: 3, delayMs: 100 }
 * );
 * ```
 */
export const redundantlyTry = async <T>(
	callback: () => Promise<T>,
	options?: {
		retryCount?: number;
		delayMs?: number;
		signal?: AbortSignal;
		shouldRetry?: (error: unknown) => boolean;
	}
): Promise<T> => {
	const retryCount = options?.retryCount ?? 3;
	const delayMs = options?.delayMs ?? 100;
	let attempts = 0;
	let lastError: unknown;

	while (attempts < retryCount && !options?.signal?.aborted) {
		try {
			return await callback();
		} catch (error) {
			lastError = error;

			// If shouldRetry is provided and returns false, don't retry
			if (options?.shouldRetry && !options.shouldRetry(error)) {
				throw error;
			}

			attempts++;

			// Delay before next attempt (but not after the last attempt)
			if (attempts < retryCount && !options?.signal?.aborted) {
				await delay(delayMs, options?.signal);
			}
		}
	}

	// If we exhausted retries or were aborted, throw the last error
	throw lastError;
};

const delay = (ms: number, signal?: AbortSignal): Promise<void> => {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) return reject(new Error("Aborted"));

		const timeout = setTimeout(() => {
			signal?.removeEventListener("abort", abortListener);
			resolve();
		}, ms);

		const abortListener = () => {
			clearTimeout(timeout);
			reject(new Error("Aborted"));
		};

		signal?.addEventListener("abort", abortListener);
	});
};
