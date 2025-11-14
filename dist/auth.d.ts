/**
 * Informations d'authentification Comelit
 */
export interface ComelitCredentials {
    token: string;
    deviceUuid: string;
    apartmentId: string;
    expirySeconds: number;
}
/**
 * Authentifie l'utilisateur auprès de l'API Comelit et récupère les credentials
 * @param email Email de l'utilisateur
 * @param password Mot de passe
 * @param baseURL URL de base de l'API (optionnel)
 * @returns Credentials complets (token, deviceUuid, apartmentId)
 */
export declare function authenticateWithComelit(email: string, password: string, baseURL?: string): Promise<ComelitCredentials>;
/**
 * Vérifie si le token est expiré
 * @param expirySeconds Timestamp d'expiration (en secondes)
 * @returns true si le token est expiré ou va expirer dans les 24h
 */
export declare function isTokenExpired(expirySeconds: number): boolean;
//# sourceMappingURL=auth.d.ts.map