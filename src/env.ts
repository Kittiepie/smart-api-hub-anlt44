function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export const env = {
    DB_HOST: requireEnv('DB_HOST'),
    DB_PORT: Number(requireEnv('DB_PORT')),
    DB_USER: requireEnv('DB_USER'),
    DB_PASSWORD: requireEnv('DB_PASSWORD'),
    DB_NAME: requireEnv('DB_NAME'),
    JWT_SECRET: requireEnv('JWT_SECRET'),
};