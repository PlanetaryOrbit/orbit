import { defineContract, rel } from '@prisma/orm-postgres/contract-builder';

export const contract = defineContract({}, ({ field, model }) => {
  const User = model('User', {
    fields: {
      id: field.id.cuid2(),
      username: field.text().unique(),
      robloxId: field.bigint().unique(),
      robloxData: field.json().optional(),
      discordData: field.json().optional(),
      googleData: field.json().optional(),
      banned: field.boolean().default(false),
      bannedAt: field.temporal.timestamp().optional(),
      bannedFor: field.text().optional(),
      isOwner: field.boolean().default(false),
      createdAt: field.temporal.createdAt(),
      updatedAt: field.temporal.updatedAt(),
    },
  });

  const Credential = model('Credential', {
    fields: {
      id: field.id.cuid2(),
      userId: field.text().unique(),
      passwordHash: field.text(),
      createdAt: field.temporal.createdAt(),
      updatedAt: field.temporal.updatedAt(),
    },
  });

  const InstanceSettings = model('InstanceSettings', {
    fields: {
      id: field.id.cuid2(),
      name: field.text().default('Orbit'),
      logoUrl: field.text().default('/favicon.png'),
      allowPasswordAuth: field.boolean().default(true),
      allowRobloxAuth: field.boolean().default(false),
      enableRegistration: field.boolean().default(true),
      primaryColor: field.text().default('#fb019c'),
      darkBackground: field.text().default('/orbitbackground-dark.svg'),
      lightBackground: field.text().default('/orbitbackground-light.svg'),
      isSetup: field.boolean().default(false),
      createdAt: field.temporal.createdAt(),
      updatedAt: field.temporal.updatedAt(),
    },
  });

  const Media = model('Media', {
    fields: {
      id: field.id.cuid2(),
      filename: field.text(),
      mimeType: field.text(),
      size: field.int(),
      storageKey: field.text().unique(),
      hash: field.text().optional(),
      width: field.int().optional(),
      height: field.int().optional(),
      alt: field.text().optional(),
      createdAt: field.temporal.createdAt(),
      updatedAt: field.temporal.updatedAt(),
    },
  });

  const Notification = model('Notification', {
    fields: {
      id: field.id.cuid2(),
      userId: field.text(),
      title: field.text(),
      description: field.text().optional(),
      icon: field.text().optional(),
      url: field.text().optional(),
      sentAt: field.temporal.createdAt(),
      expiresAt: field.temporal.timestamp().optional(),
      read: field.boolean().default(false),
      readAt: field.temporal.timestamp().optional(),
      createdAt: field.temporal.createdAt(),
    },
  });

  const Session = model('Session', {
    fields: {
      id: field.id.cuid2(),
      tokenHash: field.text().unique(),
      userId: field.text(),
      expiresAt: field.temporal.timestamp(),
      createdAt: field.temporal.createdAt(),
    },
  });

  const SignupAttempt = model('SignupAttempt', {
    fields: {
      id: field.id.cuid2(),
      username: field.text(),
      passwordHash: field.text(),
      robloxId: field.bigint(),
      verificationCode: field.text(),
      expiresAt: field.temporal.timestamp(),
      createdAt: field.temporal.createdAt(),
      updatedAt: field.temporal.updatedAt(),
    },
  });

  return {
    models: {
      User: User.relations({
        credential: rel.hasOne(Credential, { by: 'userId' }),
        notifications: rel.hasMany(Notification, { by: 'userId' }),
        sessions: rel.hasMany(Session, { by: 'userId' }),
      }).sql(({ cols, constraints }) => ({
        indexes: [
          constraints.index([cols.bannedAt], {
            name: 'User_bannedAt_idx',
          }),
          constraints.index([cols.bannedFor], {
            name: 'User_bannedFor_idx',
          }),
          constraints.index([cols.banned], {
            name: 'User_banned_idx',
          }),
          constraints.index([cols.discordData], {
            name: 'User_discordData_idx',
          }),
          constraints.index([cols.googleData], {
            name: 'User_googleData_idx',
          }),
          constraints.index([cols.robloxData], {
            name: 'User_robloxData_idx',
          }),
        ],
      })),

      Credential: Credential.relations({
        user: rel.belongsTo(User, {
          from: 'userId',
          to: 'id',
        }),
      }).sql(({ cols, constraints }) => ({
        foreignKeys: [
          constraints.foreignKey(cols.userId, User.refs.id, {
            name: 'Credential_userId_fkey',
            onDelete: 'cascade',
            onUpdate: 'cascade',
          }),
        ],
      })),

      InstanceSettings,

      Media: Media.sql(({ cols, constraints }) => ({
        indexes: [
          constraints.index([cols.createdAt], {
            name: 'Media_createdAt_idx',
          }),
          constraints.index([cols.hash], {
            name: 'Media_hash_idx',
          }),
        ],
      })),

      Notification: Notification.relations({
        user: rel.belongsTo(User, {
          from: 'userId',
          to: 'id',
        }),
      }).sql(({ cols, constraints }) => ({
        indexes: [
          constraints.index([cols.createdAt], {
            name: 'Notification_createdAt_idx',
          }),
          constraints.index([cols.userId], {
            name: 'Notification_userId_idx',
          }),
        ],
        foreignKeys: [
          constraints.foreignKey(cols.userId, User.refs.id, {
            name: 'Notification_userId_fkey',
            onDelete: 'cascade',
            onUpdate: 'cascade',
          }),
        ],
      })),

      Session: Session.relations({
        user: rel.belongsTo(User, {
          from: 'userId',
          to: 'id',
        }),
      }).sql(({ cols, constraints }) => ({
        foreignKeys: [
          constraints.foreignKey(cols.userId, User.refs.id, {
            name: 'Session_userId_fkey',
            onDelete: 'cascade',
            onUpdate: 'cascade',
          }),
        ],
      })),

      SignupAttempt: SignupAttempt.sql(({ cols, constraints }) => ({
        indexes: [
          constraints.index([cols.robloxId], {
            name: 'SignupAttempt_robloxId_idx',
          }),
        ],
      })),
    },
  };
});
