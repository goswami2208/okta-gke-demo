package com.demo.items;

import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ItemService {

    private final ItemRepository repo;

    public ItemService(ItemRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<Item> findAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public Item get(Long id) {
        return repo.findById(id).orElseThrow(() -> new NoSuchElementException("Item " + id + " not found"));
    }

    public Item create(ItemRequest req, String user) {
        Item i = new Item();
        apply(i, req);
        i.setCreatedBy(user);
        return repo.save(i);
    }

    public Item update(Long id, ItemRequest req) {
        Item i = get(id);
        apply(i, req);
        return repo.save(i);
    }

    public void delete(Long id) {
        repo.delete(get(id));
    }

    private void apply(Item i, ItemRequest r) {
        i.setName(r.name());
        i.setDescription(r.description());
        i.setQuantity(r.quantity());
    }
}
