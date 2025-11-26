/**
 * User entity representing an authenticated user in the system
 */
export class User {
  constructor(
    public id: string,
    public email: string,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  /**
   * Check if user can access a resource (placeholder for authorization logic)
   */
  canAccessResource(resourceUserId: string): boolean {
    return this.id === resourceUserId;
  }

  /**
   * Convert to DTO for API responses
   */
  toDTO() {
    return {
      id: this.id,
      email: this.email,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
