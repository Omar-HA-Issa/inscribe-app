import { SupabaseClient } from '@supabase/supabase-js';
import { DocumentRepository } from '../repositories/DocumentRepository';
import { logger } from '../../shared/utils/logger';

/**
 * ServiceFactory
 * Factory pattern for creating service instances with proper dependency injection
 * Follows Dependency Inversion Principle (DIP)
 *
 * Benefits:
 * - Centralized service creation
 * - Easy to mock for testing
 * - Consistent dependency resolution
 * - Clear dependency graph
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: Map<string, any> = new Map();

  private constructor(private supabase: SupabaseClient) {
    this.initializeServices();
  }

  /**
   * Singleton pattern - get or create the factory
   */
  static getInstance(supabase: SupabaseClient): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory(supabase);
    }
    return ServiceFactory.instance;
  }

  /**
   * Initialize all services with their dependencies
   */
  private initializeServices(): void {
    logger.debug('Initializing service factory');

    // Repositories
    this.register('documentRepository', () => new DocumentRepository(this.supabase));

    logger.info('Service factory initialized');
  }

  /**
   * Register a service factory function
   */
  register(name: string, factory: () => any): void {
    this.services.set(name, factory);
  }

  /**
   * Get a service instance
   * Services are instantiated on demand and cached
   */
  get<T>(name: string): T {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' not found in factory`);
    }

    const factory = this.services.get(name);
    return factory() as T;
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get or create service instance
   */
  getOrCreate<T>(name: string, factory: () => T): T {
    if (!this.has(name)) {
      this.register(name, factory);
    }
    return this.get<T>(name);
  }

  /**
   * Reset all services (for testing)
   */
  reset(): void {
    this.services.clear();
    this.initializeServices();
  }
}
