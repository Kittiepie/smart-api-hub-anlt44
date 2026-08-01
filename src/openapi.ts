export const openApiSpec = {
    openapi: '3.0.0',
    info: {
        title: 'smart api hub',
        version: '1.0.0',
        description:
            'dynamic REST API',
    },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            RegisterInput: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                },
            },
            LoginInput: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                },
            },
            AuthResponse: {
                type: 'object',
                properties: {
                    user: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer' },
                            email: { type: 'string' },
                            role: { type: 'string' },
                        },
                    },
                    token: { type: 'string' },
                },
            },
            Error: {
                type: 'object',
                properties: { error: { type: 'string' } },
            },
        },
    },
    paths: {
        '/auth/register': {
            post: {
                summary: 'Register a new user',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } } },
                },
                responses: {
                    '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
                    '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    '409': { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                },
            },
        },
        '/auth/login': {
            post: {
                summary: 'Log in and receive a JWT',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
                },
                responses: {
                    '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
                    '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                },
            },
        },
        '/{resource}': {
            get: {
                summary: 'List resource rows (dynamic — works for any migrated table)',
                parameters: [
                    { name: 'resource', in: 'path', required: true, schema: { type: 'string', example: 'posts' } },
                    { name: '_page', in: 'query', schema: { type: 'integer' } },
                    { name: '_limit', in: 'query', schema: { type: 'integer' } },
                    { name: '_sort', in: 'query', schema: { type: 'string' } },
                    { name: '_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
                    { name: '_fields', in: 'query', schema: { type: 'string', example: 'title,content' } },
                    { name: 'q', in: 'query', schema: { type: 'string' } },
                    { name: '_expand', in: 'query', schema: { type: 'string', example: 'user' } },
                    { name: '_embed', in: 'query', schema: { type: 'string', example: 'posts' } },
                ],
                responses: {
                    '200': { description: 'OK (also returns X-Total-Count header)' },
                    '404': { description: 'Unknown resource', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                },
            },
            post: {
                summary: 'Create a row (requires auth)',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'resource', in: 'path', required: true, schema: { type: 'string', example: 'posts' } }],
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
                responses: {
                    '201': { description: 'Created' },
                    '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    '401': { description: 'Missing/invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                },
            },
        },
        '/{resource}/{id}': {
            get: {
                summary: 'Get a single row by id',
                parameters: [
                    { name: 'resource', in: 'path', required: true, schema: { type: 'string', example: 'posts' } },
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
            },
            put: {
                summary: 'Full replace (requires auth, all fields required)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'resource', in: 'path', required: true, schema: { type: 'string', example: 'posts' } },
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
                responses: { '200': { description: 'OK' }, '400': { description: 'Validation error' }, '401': { description: 'Unauthorized' }, '404': { description: 'Not found' } },
            },
            patch: {
                summary: 'Partial update (requires auth)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'resource', in: 'path', required: true, schema: { type: 'string', example: 'posts' } },
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
                responses: { '200': { description: 'OK' }, '400': { description: 'Validation error' }, '401': { description: 'Unauthorized' }, '404': { description: 'Not found' } },
            },
            delete: {
                summary: 'Delete a row (requires auth + admin role)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'resource', in: 'path', required: true, schema: { type: 'string', example: 'posts' } },
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: { '204': { description: 'Deleted' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden — admin only' }, '404': { description: 'Not found' } },
            },
        },
        '/audit-logs': {
            get: {
                summary: 'List recent audit log entries (admin only)',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'OK',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'integer' },
                                            user_id: { type: 'integer' },
                                            action: { type: 'string', enum: ['CREATE', 'UPDATE', 'DELETE'] },
                                            resource_name: { type: 'string' },
                                            record_id: { type: 'string' },
                                            timestamp: { type: 'string', format: 'date-time' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '401': { description: 'Missing/invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    '403': { description: 'Forbidden — admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                },
            },
        },
    },
};