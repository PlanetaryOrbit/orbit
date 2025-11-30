import randomText from '@/utils/randomText';

// Mock Date to control time-based tests
const mockDate = (hour: number) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  jest.spyOn(global, 'Date').mockImplementation(() => date as any);
};

describe('randomText', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Time-based text selection', () => {
    it('should return morning texts for hours 4-11', () => {
      const testHours = [4, 5, 6, 7, 8, 9, 10, 11];
      
      testHours.forEach(hour => {
        mockDate(hour);
        const text = randomText('TestUser');
        
        expect(text).toContain('TestUser');
        expect(
          text.includes('morning') || 
          text.includes('Morning') ||
          text.includes('Rise') ||
          text.includes('Christmas') ||
          text.includes('festive') ||
          text.includes('Merry')
        ).toBe(true);
      });
    });

    it('should return afternoon texts for hours 12-19', () => {
      const testHours = [12, 13, 14, 15, 16, 17, 18, 19];
      
      testHours.forEach(hour => {
        mockDate(hour);
        const text = randomText('TestUser');
        
        expect(text).toContain('TestUser');
        expect(
          text.includes('afternoon') ||
          text.includes('Afternoon') ||
          text.includes('Festive') ||
          text.includes('season') ||
          text.includes('Christmas')
        ).toBe(true);
      });
    });

    it('should return night texts for hours 20-21 and late night for 0-3', () => {
      const nightHours = [20, 21];
      const lateNightHours = [0, 1, 2, 3];
      
      nightHours.forEach(hour => {
        mockDate(hour);
        const text = randomText('TestUser');
        
        expect(text).toContain('TestUser');
        expect(text.length).toBeGreaterThan(0);
      });

      lateNightHours.forEach(hour => {
        mockDate(hour);
        const text = randomText('TestUser');
        
        expect(text).toContain('TestUser');
        expect(
          text.includes('awake') ||
          text.includes('night') ||
          text.includes('Late') ||
          text.includes('Holiday') ||
          text.includes('cocoa')
        ).toBe(true);
      });
    });
  });

  describe('Name interpolation', () => {
    it('should include the provided name in all time periods', () => {
      const testName = 'JohnDoe';
      const hours = [2, 8, 14, 22]; // Sample from each time period
      
      hours.forEach(hour => {
        mockDate(hour);
        const text = randomText(testName);
        expect(text).toContain(testName);
      });
    });

    it('should handle names with special characters', () => {
      mockDate(10);
      const specialNames = [
        'User-123',
        "O'Brien",
        'User_Name',
        'Ñame',
        'User123!',
      ];
      
      specialNames.forEach(name => {
        const text = randomText(name);
        expect(text).toContain(name);
      });
    });

    it('should handle empty string names', () => {
      mockDate(10);
      const text = randomText('');
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });

    it('should handle very long names', () => {
      mockDate(10);
      const longName = 'A'.repeat(100);
      const text = randomText(longName);
      expect(text).toContain(longName);
    });
  });

  describe('Randomness and variety', () => {
    it('should return different texts on multiple calls (randomness check)', () => {
      mockDate(10);
      const texts = new Set();
      
      for (let i = 0; i < 50; i++) {
        texts.add(randomText('TestUser'));
      }
      
      // With 20+ morning texts, we should get multiple different ones
      expect(texts.size).toBeGreaterThan(3);
    });

    it('should always return a non-empty string', () => {
      for (let hour = 0; hour < 24; hour++) {
        mockDate(hour);
        const text = randomText('TestUser');
        expect(text).toBeTruthy();
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Christmas theme consistency', () => {
    it('should include Christmas-related keywords across all time periods', () => {
      const christmasKeywords = [
        'Christmas', 'festive', 'holiday', 'Santa', 'jingle',
        'cheer', 'merry', 'bright', 'cocoa', 'elf', 'sleigh'
      ];
      
      for (let hour = 0; hour < 24; hour++) {
        mockDate(hour);
        const text = randomText('TestUser');
        
        const hasChristmasTheme = christmasKeywords.some(keyword =>
          text.toLowerCase().includes(keyword.toLowerCase())
        );
        
        expect(hasChristmasTheme).toBe(true);
      }
    });

    it('should include emojis in messages', () => {
      const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
      
      for (let hour = 0; hour < 24; hour++) {
        mockDate(hour);
        const text = randomText('TestUser');
        expect(emojiPattern.test(text)).toBe(true);
      }
    });
  });

  describe('Boundary conditions', () => {
    it('should handle exactly midnight (hour 0)', () => {
      mockDate(0);
      const text = randomText('TestUser');
      expect(text).toContain('TestUser');
      expect(text.length).toBeGreaterThan(0);
    });

    it('should handle exactly 4am boundary', () => {
      mockDate(4);
      const text = randomText('TestUser');
      expect(text).toContain('TestUser');
    });

    it('should handle exactly noon (hour 12)', () => {
      mockDate(12);
      const text = randomText('TestUser');
      expect(text).toContain('TestUser');
    });

    it('should handle exactly 8pm (hour 20)', () => {
      mockDate(20);
      const text = randomText('TestUser');
      expect(text).toContain('TestUser');
    });

    it('should handle 11:59pm (hour 23)', () => {
      mockDate(23);
      const text = randomText('TestUser');
      expect(text).toContain('TestUser');
    });
  });

  describe('Message format consistency', () => {
    it('should always return properly formatted messages', () => {
      for (let hour = 0; hour < 24; hour++) {
        mockDate(hour);
        const text = randomText('TestUser');
        
        // Should be a string with content
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(10); // Reasonable minimum length
        
        // Should contain the username
        expect(text).toContain('TestUser');
      }
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should work with typical Roblox usernames', () => {
      mockDate(10);
      const robloxUsernames = [
        'Player123',
        'CoolGamer',
        'xXProGamerXx',
        'BuilderBob',
        'SpeedRunner99',
      ];
      
      robloxUsernames.forEach(username => {
        const text = randomText(username);
        expect(text).toContain(username);
        expect(text.length).toBeGreaterThan(0);
      });
    });

    it('should maintain consistency across rapid successive calls', () => {
      mockDate(10);
      const results: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        results.push(randomText('TestUser'));
      }
      
      // All should be valid strings containing the username
      results.forEach(text => {
        expect(typeof text).toBe('string');
        expect(text).toContain('TestUser');
        expect(text.length).toBeGreaterThan(0);
      });
    });
  });
});