INSERT INTO -- 向表中插入数据
    tags (name) -- 字段定义或取值行
VALUES -- 提供插入数据的值
    ('#art'), -- 延续当前定义
    ('#music'), -- 延续当前定义
    ('#sport'), -- 延续当前定义
    ('#travel'), -- 延续当前定义
    ('#food'), -- 延续当前定义
    ('#gaming'), -- 延续当前定义
    ('#cinema'), -- 延续当前定义
    ('#reading'), -- 延续当前定义
    ('#photography'), -- 延续当前定义
    ('#fashion'), -- 延续当前定义
    ('#coding'), -- 延续当前定义
    ('#nature'), -- 延续当前定义
    ('#dance'), -- 延续当前定义
    ('#fitness'), -- 延续当前定义
    ('#coffee'), -- 延续当前定义
    ('#animals'), -- 延续当前定义
    ('#cars'), -- 延续当前定义
    ('#science'), -- 延续当前定义
    ('#anime'), -- 延续当前定义
    ('#design') ON CONFLICT (name) DO NOTHING; -- SQL 配置行