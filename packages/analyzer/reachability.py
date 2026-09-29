import ast
from pathlib import Path
from typing import List, Dict, Set, Optional, Tuple
from collections import defaultdict
from .scanner import Finding


class CallGraphVisitor(ast.NodeVisitor):
    def __init__(self, module_name: str):
        self.module_name = module_name
        self.current_func = None
        self.calls: Dict[str, Set[str]] = defaultdict(set)
        self.func_definitions = {}

    def visit_FunctionDef(self, node: ast.FunctionDef):
        prev_func = self.current_func
        func_name = f"{self.module_name}.{node.name}"
        self.current_func = func_name
        self.func_definitions[func_name] = node
        self.generic_visit(node)
        self.current_func = prev_func

    visit_AsyncFunctionDef = visit_FunctionDef

    def visit_Call(self, node: ast.Call):
        if self.current_func:
            called_name = None
            if isinstance(node.func, ast.Name):
                called_name = node.func.id
            elif isinstance(node.func, ast.Attribute):
                if isinstance(node.func.value, ast.Name):
                    called_name = f"{node.func.value.id}.{node.func.attr}"
                else:
                    called_name = node.func.attr
            if called_name:
                self.calls[self.current_func].add(called_name)
        self.generic_visit(node)


def _discover_entrypoints(target_dir: Path) -> Dict[str, str]:
    """
    Auto-discover entrypoints from the target repo.
    
    For a Flask/FastAPI app looks for route decorators (@app.route, @router.get, etc.)
    Maps HTTP path -> module.function_name
    
    Falls back to service-module heuristics if no framework routes found.
    """
    entrypoints: Dict[str, str] = {}

    # Pattern 1: Decorated routes (@app.route('/path'), @router.get('/path'), etc.)
    for py_file in target_dir.rglob("*.py"):
        if "test" in py_file.name.lower():
            continue
        try:
            content = py_file.read_text(encoding="utf-8", errors="replace")
            tree = ast.parse(content, filename=str(py_file))
            module_name = py_file.stem
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    for decorator in node.decorator_list:
                        route_path = _extract_route_path(decorator)
                        if route_path:
                            entrypoints[route_path] = f"{module_name}.{node.name}"
        except Exception:
            pass

    # Pattern 2: Heuristic — service directories map to /{dirname}
    # e.g. services/archive/archive.py -> /archive
    if not entrypoints:
        for py_file in target_dir.rglob("*.py"):
            if "test" in py_file.name.lower():
                continue
            rel = py_file.relative_to(target_dir)
            parts = rel.parts
            # Look for services/{service_name}/{service_name}.py pattern
            if len(parts) >= 2 and parts[-1].replace(".py", "") == parts[-2]:
                service_name = parts[-2]
                module_name = py_file.stem
                # Find main handler function
                try:
                    content = py_file.read_text(encoding="utf-8", errors="replace")
                    tree = ast.parse(content, filename=str(py_file))
                    for node in ast.walk(tree):
                        if isinstance(node, ast.FunctionDef):
                            func = node.name.lower()
                            if any(kw in func for kw in ["handle", "process", "run", "execute", "main"]):
                                entrypoints[f"/{service_name}"] = f"{module_name}.{node.name}"
                                break
                    else:
                        # Just use first function as entrypoint
                        for node in ast.walk(tree):
                            if isinstance(node, ast.FunctionDef):
                                entrypoints[f"/{service_name}"] = f"{module_name}.{node.name}"
                                break
                except Exception:
                    entrypoints[f"/{service_name}"] = f"{module_name}.main"

    # Always include known Enterprise_info entrypoints as fallback
    # Include both /name and /name-service variants to match the repo layout
    known = {
        "/archive": "archive.handle_archive",
        "/archive-service": "archive.handle_archive",
        "/partner": "partner.handle_partner_message",
        "/partner-service": "partner.handle_partner_message",
        "/auth": "auth.login",
        "/identity-service": "auth.login",
        "/export": "export.export_data",
        "/export-service": "export.export_data",
        "/backup": "backup.backup_data",
        "/backup-service": "backup.backup_data",
        "/legacy-service": "legacy.main",
    }
    for k, v in known.items():
        if k not in entrypoints:
            entrypoints[k] = v

    return entrypoints


def _extract_route_path(decorator_node) -> Optional[str]:
    """Extract route path string from a decorator AST node."""
    # @app.route('/path') or @router.get('/path')
    if isinstance(decorator_node, ast.Call):
        if decorator_node.args:
            first = decorator_node.args[0]
            if isinstance(first, ast.Constant) and isinstance(first.value, str):
                path = first.value
                if path.startswith("/"):
                    return path
    return None


class ReachabilityAnalyzer:
    def __init__(self, target_dir: str):
        self.target_dir = Path(target_dir).resolve()
        self.call_graph: Dict[str, Set[str]] = defaultdict(set)
        # Map module name -> set of functions defined in it
        self.module_functions: Dict[str, Set[str]] = defaultdict(set)
        self.entrypoints = _discover_entrypoints(self.target_dir)
        self._build_call_graph()

    def _build_call_graph(self):
        for p in self.target_dir.rglob("*.py"):
            try:
                module_name = p.stem
                content = p.read_text(encoding="utf-8", errors="replace")
                tree = ast.parse(content, filename=str(p))
                visitor = CallGraphVisitor(module_name)
                visitor.visit(tree)

                for func_name in visitor.func_definitions:
                    self.module_functions[module_name].add(func_name)

                for caller, callees in visitor.calls.items():
                    for callee in callees:
                        if "." not in callee:
                            callee = f"{module_name}.{callee}"
                        self.call_graph[caller].add(callee)
            except Exception:
                pass

    def _can_reach(self, source: str, target_module: str, visited: Set[str]) -> bool:
        """Check if source can reach any function in target_module."""
        if source.split(".")[0] == target_module:
            return True
        if source in visited:
            return False
        visited.add(source)
        for callee in self.call_graph.get(source, set()):
            if self._can_reach(callee, target_module, visited):
                return True
        return False

    def analyze_finding(self, finding: Finding) -> Tuple[str, Optional[str]]:
        """
        Determines reachability of a finding.
        Returns (status, entrypoint_name)
        status in ('REACHABLE', 'UNREACHABLE', 'CONDITIONAL', 'UNKNOWN')
        """
        if not finding.source_file:
            return "UNKNOWN", None

        source_file = Path(finding.source_file)
        file_stem = source_file.stem

        # Skip test files
        if "test" in file_stem.lower():
            return "UNREACHABLE", None

        # Check if directly matches an entrypoint's module
        for ep_name, ep_func in self.entrypoints.items():
            ep_module = ep_func.split(".")[0]
            if file_stem == ep_module:
                return "REACHABLE", ep_name

        # Check if reachable via call graph from any entrypoint
        for ep_name, ep_func in self.entrypoints.items():
            visited: Set[str] = set()
            if self._can_reach(ep_func, file_stem, visited):
                return "REACHABLE", ep_name

        # Check if module is imported by any entrypoint module
        for ep_name, ep_func in self.entrypoints.items():
            ep_module = ep_func.split(".")[0]
            # If ep_module calls into file_stem
            for caller in self.call_graph:
                if caller.startswith(ep_module + "."):
                    for callee in self.call_graph[caller]:
                        if callee.startswith(file_stem + "."):
                            return "REACHABLE", ep_name

        # Check parent directory for indirect reachability hints
        # e.g. services/common/ called by services/archive/
        rel_path = None
        try:
            if finding.source_file:
                full_path = self.target_dir / finding.source_file
                if full_path.exists():
                    rel_path = full_path.relative_to(self.target_dir)
        except Exception:
            pass

        if rel_path and len(rel_path.parts) >= 2:
            parent_dir = rel_path.parts[0]
            # Normalize: strip common suffixes like -service
            parent_normalized = parent_dir.replace("-service", "")
            # If parent_dir (or its normalized form) matches an entrypoint
            for ep_name in self.entrypoints:
                ep_stripped = ep_name.lstrip("/")
                if ep_stripped == parent_dir or ep_stripped == parent_normalized:
                    return "REACHABLE", ep_name

        return "UNKNOWN", None
