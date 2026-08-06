import { describe, it, expect } from "vitest";
import * as crisis from "./crisis";

describe("Crisis Mode System", () => {
  const testUserId = 999;

  describe("Crisis Events", () => {
    let crisisId: number;

    it("should create a crisis event", async () => {
      const result = await crisis.createCrisisEvent(testUserId, "high", "Sobrecarga sensorial");
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'result' in result) {
        const insertResult = result.result as any;
        if (insertResult && 'insertId' in insertResult) {
          crisisId = insertResult.insertId;
          expect(crisisId).toBeGreaterThan(0);
        }
      }
    });

    it("should resolve a crisis event", async () => {
      if (!crisisId) {
        const createResult = await crisis.createCrisisEvent(testUserId, "medium");
        if (createResult && typeof createResult === 'object' && 'result' in createResult) {
          const insertResult = createResult.result as any;
          if (insertResult && 'insertId' in insertResult) {
            crisisId = insertResult.insertId;
          }
        }
      }

      const result = await crisis.resolveCrisisEvent(
        crisisId,
        15,
        ["box-breathing", "5-4-3-2-1"],
        "Consegui me acalmar"
      );
      expect(result).toBeDefined();
    });

    it("should get user crisis events", async () => {
      const events = await crisis.getUserCrisisEvents(testUserId, 10);
      expect(Array.isArray(events)).toBe(true);
    });

    it("should get user crisis stats", async () => {
      const stats = await crisis.getUserCrisisStats(testUserId);
      expect(stats).toBeDefined();
    });
  });

  describe("Emergency Contacts", () => {
    let contactId: number;

    it("should create an emergency contact", async () => {
      const result = await crisis.createEmergencyContact(
        testUserId,
        "Maria Silva",
        "Mãe",
        "+5511999999999",
        "maria@example.com",
        true,
        "Ligar em caso de crise severa"
      );
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'result' in result) {
        const insertResult = result.result as any;
        if (insertResult && 'insertId' in insertResult) {
          contactId = insertResult.insertId;
          expect(contactId).toBeGreaterThan(0);
        }
      }
    });

    it("should get user emergency contacts", async () => {
      const contacts = await crisis.getUserEmergencyContacts(testUserId);
      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts.length).toBeGreaterThan(0);
    });

    it("should update an emergency contact", async () => {
      if (!contactId) {
        const createResult = await crisis.createEmergencyContact(
          testUserId,
          "João Santos",
          "Pai"
        );
        if (createResult && typeof createResult === 'object' && 'result' in createResult) {
          const insertResult = createResult.result as any;
          if (insertResult && 'insertId' in insertResult) {
            contactId = insertResult.insertId;
          }
        }
      }

      const result = await crisis.updateEmergencyContact(
        contactId,
        "Maria Silva",
        "Mãe",
        "+5511888888888",
        "maria.updated@example.com",
        true,
        "Contato atualizado"
      );
      expect(result).toBeDefined();
    });

    it("should delete an emergency contact", async () => {
      if (!contactId) {
        const createResult = await crisis.createEmergencyContact(
          testUserId,
          "Contato Teste",
          "Teste"
        );
        if (createResult && typeof createResult === 'object' && 'result' in createResult) {
          const insertResult = createResult.result as any;
          if (insertResult && 'insertId' in insertResult) {
            contactId = insertResult.insertId;
          }
        }
      }

      const result = await crisis.deleteEmergencyContact(contactId);
      expect(result).toBeDefined();
    });
  });

  describe("Preset Messages", () => {
    let messageId: number;

    it("should create a preset message", async () => {
      const result = await crisis.createPresetMessage(
        testUserId,
        "Preciso de Ajuda",
        "Estou tendo uma crise e preciso de suporte. Pode me ligar?",
        "help",
        true
      );
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'result' in result) {
        const insertResult = result.result as any;
        if (insertResult && 'insertId' in insertResult) {
          messageId = insertResult.insertId;
          expect(messageId).toBeGreaterThan(0);
        }
      }
    });

    it("should get user preset messages", async () => {
      const messages = await crisis.getUserPresetMessages(testUserId);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
    });

    it("should update a preset message", async () => {
      if (!messageId) {
        const createResult = await crisis.createPresetMessage(
          testUserId,
          "Teste",
          "Mensagem teste"
        );
        if (createResult && typeof createResult === 'object' && 'result' in createResult) {
          const insertResult = createResult.result as any;
          if (insertResult && 'insertId' in insertResult) {
            messageId = insertResult.insertId;
          }
        }
      }

      const result = await crisis.updatePresetMessage(
        messageId,
        "Preciso de Ajuda - Atualizado",
        "Mensagem atualizada",
        "help"
      );
      expect(result).toBeDefined();
    });

    it("should increment message use count", async () => {
      if (!messageId) {
        const createResult = await crisis.createPresetMessage(
          testUserId,
          "Teste",
          "Mensagem teste"
        );
        if (createResult && typeof createResult === 'object' && 'result' in createResult) {
          const insertResult = createResult.result as any;
          if (insertResult && 'insertId' in insertResult) {
            messageId = insertResult.insertId;
          }
        }
      }

      const result = await crisis.incrementMessageUseCount(messageId);
      expect(result).toBeDefined();
    });

    it("should delete a preset message", async () => {
      if (!messageId) {
        const createResult = await crisis.createPresetMessage(
          testUserId,
          "Teste Delete",
          "Mensagem para deletar"
        );
        if (createResult && typeof createResult === 'object' && 'result' in createResult) {
          const insertResult = createResult.result as any;
          if (insertResult && 'insertId' in insertResult) {
            messageId = insertResult.insertId;
          }
        }
      }

      const result = await crisis.deletePresetMessage(messageId);
      expect(result).toBeDefined();
    });
  });

  describe("Crisis Techniques", () => {
    it("should get all crisis techniques", async () => {
      const techniques = await crisis.getAllCrisisTechniques();
      expect(Array.isArray(techniques)).toBe(true);
      expect(techniques.length).toBeGreaterThan(0);
    });

    it("should get crisis techniques by category", async () => {
      const techniques = await crisis.getCrisisTechniquesByCategory("breathing");
      expect(Array.isArray(techniques)).toBe(true);
    });

    it("should increment technique usage count", async () => {
      const techniques = await crisis.getAllCrisisTechniques();
      if (Array.isArray(techniques) && techniques.length > 0) {
        const techniqueId = (techniques[0] as any).id;
        const result = await crisis.incrementTechniqueUsageCount(techniqueId);
        expect(result).toBeDefined();
      }
    });
  });
});
