from app.models.storage import StorageNode
from app.services import storage_manager


def _make_node(db_session, name, used=0.0, online=True):
    node = StorageNode(name=name, folder_path=f"/tmp/{name}", is_online=online, used_space_mb=used)
    db_session.add(node)
    db_session.commit()
    db_session.refresh(node)
    return node


def test_round_robin_cycles_through_nodes(db_session):
    n1 = _make_node(db_session, "node_a")
    n2 = _make_node(db_session, "node_b")

    storage_manager._round_robin_index = 0  # reset for deterministic test
    selected = [storage_manager.select_node_round_robin(db_session).id for _ in range(4)]
    assert selected == [n1.id, n2.id, n1.id, n2.id]


def test_least_used_picks_smallest_node(db_session):
    _make_node(db_session, "node_big", used=500.0)
    small = _make_node(db_session, "node_small", used=10.0)

    selected = storage_manager.select_node_least_used(db_session)
    assert selected.id == small.id


def test_offline_nodes_excluded_from_selection(db_session):
    _make_node(db_session, "node_offline", online=False)
    online_node = _make_node(db_session, "node_online", online=True)

    selected = storage_manager.select_node_round_robin(db_session)
    assert selected.id == online_node.id


def test_no_online_nodes_returns_none(db_session):
    _make_node(db_session, "node_down", online=False)
    assert storage_manager.select_node_round_robin(db_session) is None


def test_find_failover_node_excludes_given_node(db_session):
    primary = _make_node(db_session, "primary")
    backup = _make_node(db_session, "backup")

    failover = storage_manager.find_failover_node(db_session, exclude_node_id=primary.id)
    assert failover.id == backup.id
