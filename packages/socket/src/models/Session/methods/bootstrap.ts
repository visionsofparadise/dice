import { Session } from "..";

export const bootstrapSession = async (session: Session): Promise<void> => {
	await session.healthcheckEndpoint();
	await session.healthcheckAddressPool();
};
