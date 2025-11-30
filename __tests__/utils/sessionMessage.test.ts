import { generateSessionTimeMessage } from '@/utils/sessionMessage';

describe('generateSessionTimeMessage', () => {
  describe('Time-based message selection', () => {
    it('should return morning messages for early morning hours (4am-11am)', () => {
      const testTimes = [4, 5, 6, 7, 8, 9, 10, 11];
      
      testTimes.forEach(hour => {
        const date = new Date();
        date.setHours(hour, 0, 0, 0);
        
        const message = generateSessionTimeMessage('TestGame', date);
        expect(message).toContain('TestGame');
        expect(
          message.includes('morning') || 
          message.includes('Morning') || 
          message.includes('Dawn') ||
          message.includes('Early bird') ||
          message.includes('Rise') ||
          message.includes('First light') ||
          message.includes('Coffee') ||
          message.includes('Sunrise')
        ).toBe(true);
      });
    });

    it('should return afternoon messages for afternoon hours (12pm-7pm)', () => {
      const testTimes = [12, 13, 14, 15, 16, 17, 18, 19];
      
      testTimes.forEach(hour => {
        const date = new Date();
        date.setHours(hour, 0, 0, 0);
        
        const message = generateSessionTimeMessage('TestGame', date);
        expect(message).toContain('TestGame');
        expect(
          message.includes('Afternoon') || 
          message.includes('afternoon') ||
          message.includes('Midday') ||
          message.includes('Lunch') ||
          message.includes('Daytime') ||
          message.includes('Sunny') ||
          message.includes('Peak')
        ).toBe(true);
      });
    });

    it('should return evening messages for evening hours (8pm-9pm)', () => {
      const testTimes = [20, 21];
      
      testTimes.forEach(hour => {
        const date = new Date();
        date.setHours(hour, 0, 0, 0);
        
        const message = generateSessionTimeMessage('TestGame', date);
        expect(message).toContain('TestGame');
        expect(
          message.includes('Evening') || 
          message.includes('evening') ||
          message.includes('Night') ||
          message.includes('Twilight') ||
          message.includes('After-hours') ||
          message.includes('Sunset') ||
          message.includes('Moonlight') ||
          message.includes('Night owl')
        ).toBe(true);
      });
    });

    it('should return late night messages for very late hours (10pm-3am)', () => {
      const testTimes = [22, 23, 0, 1, 2, 3];
      
      testTimes.forEach(hour => {
        const date = new Date();
        date.setHours(hour, 0, 0, 0);
        
        const message = generateSessionTimeMessage('TestGame', date);
        expect(message).toContain('TestGame');
        expect(
          message.includes('Midnight') || 
          message.includes('Late night') ||
          message.includes('Insomnia') ||
          message.includes('After midnight') ||
          message.includes('Nocturnal') ||
          message.includes('Sleepless')
        ).toBe(true);
      });
    });
  });

  describe('Game name handling', () => {
    it('should use provided game name', () => {
      const date = new Date();
      date.setHours(10, 0, 0, 0);
      
      const message = generateSessionTimeMessage('Custom Game', date);
      expect(message).toContain('Custom Game');
    });

    it('should use "Roblox" as default when game name is null', () => {
      const date = new Date();
      date.setHours(10, 0, 0, 0);
      
      const message = generateSessionTimeMessage(null, date);
      expect(message).toContain('Roblox');
    });

    it('should handle empty string game name by using "Roblox"', () => {
      const date = new Date();
      date.setHours(10, 0, 0, 0);
      
      const message = generateSessionTimeMessage('', date);
      expect(message).toContain('Roblox');
    });

    it('should properly format game names with special characters', () => {
      const date = new Date();
      date.setHours(10, 0, 0, 0);
      
      const gameName = 'Game: Test & Demo';
      const message = generateSessionTimeMessage(gameName, date);
      expect(message).toContain(gameName);
    });
  });

  describe('Consistency and randomness', () => {
    it('should return different messages on multiple calls (randomness check)', () => {
      const date = new Date();
      date.setHours(10, 0, 0, 0);
      
      const messages = new Set();
      for (let i = 0; i < 50; i++) {
        messages.add(generateSessionTimeMessage('TestGame', date));
      }
      
      // With 9+ morning messages, we should get at least 3 different ones in 50 tries
      expect(messages.size).toBeGreaterThan(2);
    });

    it('should always return a non-empty string', () => {
      const hours = Array.from({ length: 24 }, (_, i) => i);
      
      hours.forEach(hour => {
        const date = new Date();
        date.setHours(hour, 0, 0, 0);
        
        const message = generateSessionTimeMessage('TestGame', date);
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle exactly midnight (hour 0)', () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      
      const message = generateSessionTimeMessage('TestGame', date);
      expect(message).toContain('TestGame');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should handle exactly noon (hour 12)', () => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      
      const message = generateSessionTimeMessage('TestGame', date);
      expect(message).toContain('TestGame');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should handle boundary at 4am', () => {
      const date = new Date();
      date.setHours(4, 0, 0, 0);
      
      const message = generateSessionTimeMessage('TestGame', date);
      expect(message).toContain('TestGame');
    });

    it('should handle boundary at 8pm (20:00)', () => {
      const date = new Date();
      date.setHours(20, 0, 0, 0);
      
      const message = generateSessionTimeMessage('TestGame', date);
      expect(message).toContain('TestGame');
    });

    it('should handle boundary at 10pm (22:00)', () => {
      const date = new Date();
      date.setHours(22, 0, 0, 0);
      
      const message = generateSessionTimeMessage('TestGame', date);
      expect(message).toContain('TestGame');
    });
  });

  describe('Format validation', () => {
    it('should always include the game name in the message', () => {
      const gameNames = ['Roblox', 'TestGame', 'My Custom Game', 'Game123'];
      
      gameNames.forEach(gameName => {
        for (let hour = 0; hour < 24; hour++) {
          const date = new Date();
          date.setHours(hour, 0, 0, 0);
          
          const message = generateSessionTimeMessage(gameName, date);
          expect(message).toContain(gameName);
        }
      });
    });

    it('should return messages with proper sentence structure', () => {
      const date = new Date();
      date.setHours(10, 0, 0, 0);
      
      const message = generateSessionTimeMessage('TestGame', date);
      // Should contain "in TestGame" pattern
      expect(message).toMatch(/in TestGame/);
    });
  });
});