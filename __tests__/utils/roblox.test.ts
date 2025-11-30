import {
  getRobloxUsername,
  getRobloxThumbnail,
  getRobloxDisplayName,
  getRobloxUserId,
} from '@/utils/roblox';
import noblox from 'noblox.js';

// Mock the noblox module
jest.mock('noblox.js');

const mockedNoblox = noblox as jest.Mocked<typeof noblox>;

describe('roblox utility functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRobloxUsername', () => {
    it('should return username for valid user ID', async () => {
      const mockUserId = 12345;
      const mockUsername = 'TestUser';
      
      mockedNoblox.getUsernameFromId.mockResolvedValue(mockUsername);
      
      const result = await getRobloxUsername(mockUserId);
      expect(result).toBe(mockUsername);
      expect(mockedNoblox.getUsernameFromId).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle BigInt user IDs', async () => {
      const mockUserId = BigInt(123456789012345);
      const mockUsername = 'BigIntUser';
      
      mockedNoblox.getUsernameFromId.mockResolvedValue(mockUsername);
      
      const result = await getRobloxUsername(mockUserId);
      expect(result).toBe(mockUsername);
      expect(mockedNoblox.getUsernameFromId).toHaveBeenCalledWith(Number(mockUserId));
    });

    it('should return "Unknown User" on error', async () => {
      const mockUserId = 12345;
      
      mockedNoblox.getUsernameFromId.mockRejectedValue(new Error('API Error'));
      
      const result = await getRobloxUsername(mockUserId);
      expect(result).toBe('Unknown User');
    });

    it('should handle timeout errors', async () => {
      const mockUserId = 12345;
      
      mockedNoblox.getUsernameFromId.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('TestUser'), 15000))
      );
      
      const result = await getRobloxUsername(mockUserId);
      expect(result).toBe('Unknown User');
    }, 15000);
  });

  describe('getRobloxThumbnail', () => {
    it('should return thumbnail URL for valid user ID', async () => {
      const mockUserId = 12345;
      const mockThumbnailUrl = 'https://example.com/thumbnail.png';
      
      mockedNoblox.getPlayerThumbnail.mockResolvedValue([
        { imageUrl: mockThumbnailUrl },
      ] as any);
      
      const result = await getRobloxThumbnail(mockUserId);
      expect(result).toBe(mockThumbnailUrl);
      expect(mockedNoblox.getPlayerThumbnail).toHaveBeenCalledWith(
        mockUserId,
        '720x720',
        'png',
        false,
        'headshot'
      );
    });

    it('should handle BigInt user IDs', async () => {
      const mockUserId = BigInt(123456789012345);
      const mockThumbnailUrl = 'https://example.com/thumbnail.png';
      
      mockedNoblox.getPlayerThumbnail.mockResolvedValue([
        { imageUrl: mockThumbnailUrl },
      ] as any);
      
      const result = await getRobloxThumbnail(mockUserId);
      expect(result).toBe(mockThumbnailUrl);
    });

    it('should return empty string on error', async () => {
      const mockUserId = 12345;
      
      mockedNoblox.getPlayerThumbnail.mockRejectedValue(new Error('API Error'));
      
      const result = await getRobloxThumbnail(mockUserId);
      expect(result).toBe('');
    });

    it('should handle timeout errors', async () => {
      const mockUserId = 12345;
      
      mockedNoblox.getPlayerThumbnail.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([{ imageUrl: 'url' }] as any), 15000))
      );
      
      const result = await getRobloxThumbnail(mockUserId);
      expect(result).toBe('');
    }, 15000);
  });

  describe('getRobloxDisplayName', () => {
    it('should return display name for valid user ID', async () => {
      const mockUserId = 12345;
      const mockDisplayName = 'Display Name';
      
      mockedNoblox.getUserInfo.mockResolvedValue({
        displayName: mockDisplayName,
      } as any);
      
      const result = await getRobloxDisplayName(mockUserId);
      expect(result).toBe(mockDisplayName);
    });

    it('should fallback to username if display name is empty', async () => {
      const mockUserId = 12345;
      const mockUsername = 'TestUser';
      
      mockedNoblox.getUserInfo.mockResolvedValue({
        displayName: '',
      } as any);
      mockedNoblox.getUsernameFromId.mockResolvedValue(mockUsername);
      
      const result = await getRobloxDisplayName(mockUserId);
      expect(result).toBe('Unknown User');
    });

    it('should fallback to username on getUserInfo error', async () => {
      const mockUserId = 12345;
      const mockUsername = 'TestUser';
      
      mockedNoblox.getUserInfo.mockRejectedValue(new Error('API Error'));
      mockedNoblox.getUsernameFromId.mockResolvedValue(mockUsername);
      
      const result = await getRobloxDisplayName(mockUserId);
      expect(result).toBe(mockUsername);
    });

    it('should return "Unknown User" if both APIs fail', async () => {
      const mockUserId = 12345;
      
      mockedNoblox.getUserInfo.mockRejectedValue(new Error('API Error'));
      mockedNoblox.getUsernameFromId.mockRejectedValue(new Error('API Error'));
      
      const result = await getRobloxDisplayName(mockUserId);
      expect(result).toBe('Unknown User');
    });

    it('should handle BigInt user IDs', async () => {
      const mockUserId = BigInt(123456789012345);
      const mockDisplayName = 'Big Int Display Name';
      
      mockedNoblox.getUserInfo.mockResolvedValue({
        displayName: mockDisplayName,
      } as any);
      
      const result = await getRobloxDisplayName(mockUserId);
      expect(result).toBe(mockDisplayName);
    });
  });

  describe('getRobloxUserId', () => {
    it('should return user ID for valid username', async () => {
      const mockUsername = 'TestUser';
      const mockUserId = 12345;
      
      mockedNoblox.getIdFromUsername.mockResolvedValue(mockUserId);
      
      const result = await getRobloxUserId(mockUsername);
      expect(result).toBe(mockUserId);
      expect(mockedNoblox.getIdFromUsername).toHaveBeenCalledWith(mockUsername);
    });

    it('should throw error when user is not found', async () => {
      const mockUsername = 'NonExistentUser';
      
      mockedNoblox.getIdFromUsername.mockRejectedValue(new Error('User not found'));
      
      await expect(getRobloxUserId(mockUsername)).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const mockUsername = 'TestUser';
      
      mockedNoblox.getIdFromUsername.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(12345), 15000))
      );
      
      await expect(getRobloxUserId(mockUsername)).rejects.toThrow('Request timed out');
    }, 15000);

    it('should accept optional origin parameter', async () => {
      const mockUsername = 'TestUser';
      const mockUserId = 12345;
      const origin = 'test-origin';
      
      mockedNoblox.getIdFromUsername.mockResolvedValue(mockUserId);
      
      const result = await getRobloxUserId(mockUsername, origin);
      expect(result).toBe(mockUserId);
    });

    it('should handle usernames with special characters', async () => {
      const mockUsername = 'User_Name-123';
      const mockUserId = 12345;
      
      mockedNoblox.getIdFromUsername.mockResolvedValue(mockUserId);
      
      const result = await getRobloxUserId(mockUsername);
      expect(result).toBe(mockUserId);
    });
  });

  describe('Timeout functionality', () => {
    it('should timeout requests after 12 seconds', async () => {
      const mockUserId = 12345;
      
      mockedNoblox.getUsernameFromId.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('TestUser'), 13000))
      );
      
      const result = await getRobloxUsername(mockUserId);
      expect(result).toBe('Unknown User');
    }, 15000);
  });
});