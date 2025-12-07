class ProjectManager {
  static createProject = jest.fn();
  static validateProject = jest.fn();
  static loadProject = jest.fn();
}

module.exports = { ProjectManager };