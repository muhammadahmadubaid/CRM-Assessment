export interface CurrentUserPayload {
    id: string;
    email: string;
    role: 'admin' | 'member';
    organizationId: string;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
