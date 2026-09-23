package com.example.animebackend.repository;

import com.example.animebackend.entity.WatchEvent;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WatchEventRepository extends JpaRepository<WatchEvent, Long> {

    long countByWatchedAtAfter(Instant since);

    @Query("select count(distinct w.userId) from WatchEvent w")
    long countDistinctViewers();

    @Query("select count(distinct w.userId) from WatchEvent w where w.watchedAt > :since")
    long countDistinctViewersSince(@Param("since") Instant since);

    /** Top titles by total views: [animeKey, animeTitle, count]. */
    @Query(
            "select w.animeKey, max(w.animeTitle), count(w) as c "
                    + "from WatchEvent w group by w.animeKey order by c desc")
    List<Object[]> topAnime(Pageable pageable);

    /** Views per day for the last N days: [yyyy-mm-dd string, count]. */
    @Query(
            "select function('to_char', w.watchedAt, 'YYYY-MM-DD'), count(w) "
                    + "from WatchEvent w where w.watchedAt > :since "
                    + "group by function('to_char', w.watchedAt, 'YYYY-MM-DD') "
                    + "order by 1")
    List<Object[]> dailyCountsSince(@Param("since") Instant since);

    List<WatchEvent> findTop20ByOrderByWatchedAtDesc();
}
